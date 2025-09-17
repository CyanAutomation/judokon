import {
  waitingForMatchStartEnter,
  matchStartEnter,
  cooldownEnter,
  roundStartEnter,
  waitingForPlayerActionEnter,
  roundDecisionEnter,
  roundOverEnter,
  matchDecisionEnter,
  matchOverEnter,
  interruptRoundEnter,
  interruptMatchEnter,
  roundModificationEnter
} from "./orchestratorHandlers.js";
import { resetGame as resetGameLocal, startRound as startRoundLocal } from "./roundManager.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { domStateListener, createDebugLogListener } from "./stateTransitionListeners.js";
import { getStateSnapshot } from "./battleDebug.js";
import * as debugHooks from "./debugHooks.js";
import stateCatalog from "./stateCatalog.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { logStateTransition } from "./debugLogger.js";
import { preloadTimerUtils } from "/src/helpers/TimerController.js";
import { initScoreboardAdapter } from "/src/helpers/classicBattle/scoreboardAdapter.js";
import { createStateManager } from "/src/helpers/classicBattle/stateManager.js";
import "./uiService.js";

let machine = null;
let debugLogListener = null;
let visibilityHandler = null;

function isBattleStore(candidate) {
  if (!candidate || typeof candidate !== "object") return false;
  return (
    Object.prototype.hasOwnProperty.call(candidate, "selectionMade") ||
    Object.prototype.hasOwnProperty.call(candidate, "stallTimeoutMs") ||
    Object.prototype.hasOwnProperty.call(candidate, "playerChoice")
  );
}

function normalizeContextOverrides(contextOverrides) {
  if (!contextOverrides || typeof contextOverrides !== "object") {
    return {};
  }
  if (isBattleStore(contextOverrides) && !("store" in contextOverrides)) {
    return { store: contextOverrides };
  }
  return { ...contextOverrides };
}

function normalizeDependencies(dependencies) {
  if (!dependencies) return {};
  if (typeof dependencies === "function") {
    return { startRoundWrapper: dependencies };
  }
  return { ...dependencies };
}

function normalizeHooks(hooks) {
  if (!hooks) return {};
  if (typeof hooks === "function") {
    return { onStateChange: hooks };
  }
  return hooks;
}

function applyResetGame(context, store, deps) {
  if ("doResetGame" in context) return;
  if (typeof deps.resetGame === "function" && store) {
    context.doResetGame = () => deps.resetGame?.(context.store ?? store);
    return;
  }
  if (store) {
    context.doResetGame = () => resetGameLocal(context.store ?? store);
    return;
  }
  if (typeof deps.resetGame === "function") {
    context.doResetGame = deps.resetGame;
  }
}

function selectStartRoundDependency(deps) {
  if (typeof deps.doStartRound === "function") return deps.doStartRound;
  if (typeof deps.startRound === "function") return deps.startRound;
  return null;
}

function applyStartRound(context, store, deps) {
  if ("doStartRound" in context) return;
  const startRoundDep = selectStartRoundDependency(deps);
  if (startRoundDep) {
    context.doStartRound = (activeStore) =>
      startRoundDep(activeStore ?? context.store ?? store);
    return;
  }
  if (store) {
    context.doStartRound = (activeStore) =>
      startRoundLocal(activeStore ?? context.store ?? store);
  }
}

function resolveMachineContext(overrides, deps) {
  const store = overrides.store ?? deps.store ?? null;
  const scheduler = overrides.scheduler ?? deps.scheduler ?? null;
  const startRoundWrapper =
    overrides.startRoundWrapper ?? deps.startRoundWrapper ?? null;

  const context = { ...overrides };
  if (!("store" in context)) context.store = store;
  if (scheduler && !("scheduler" in context)) context.scheduler = scheduler;
  if (!("engine" in context)) {
    context.engine = overrides.engine ?? deps.engine ?? store?.engine ?? null;
  }
  if (startRoundWrapper && !("startRoundWrapper" in context)) {
    context.startRoundWrapper = startRoundWrapper;
  }

  applyResetGame(context, store, deps);
  applyStartRound(context, store, deps);

  if (store && typeof store === "object") {
    store.context = { ...(store.context || {}), ...context };
  }

  return { context };
}

function createTransitionHook(hookSet) {
  return async ({ from, to, event }) => {
    const detail = { from, to, event };
    emitBattleEvent("battleStateChange", detail);
    try {
      await hookSet.onStateChange?.(detail);
    } catch {}
    emitDiagnostics(from, to, event);
    emitReadiness(from, to, event);
    emitStateChange(from, to);
    mirrorTimerState();
    emitResolution(event);
  };
}

/**
 * Initialize the classic battle orchestrator (state machine) and attach listeners.
 *
 * @pseudocode
 * 1. Merge provided overrides and dependencies into the machine context.
 * 2. Build the onEnter map and initialize the state manager with an onTransition hook.
 * 3. Attach listeners, preload dependencies, and return the initialized machine.
 *
 * @param {object} [contextOverrides] - Optional context overrides (e.g., store, scheduler).
 * @param {object|Function} [dependencies] - Optional dependency bag or `startRoundWrapper` function.
 * @param {object|Function} [hooks] - Optional hooks such as `onStateChange`.
 * @returns {Promise<import("./stateManager.js").ClassicBattleStateManager>} The initialized state machine.
 */
export async function initClassicBattleOrchestrator(
  contextOverrides = {},
  dependencies = {},
  hooks = {}
) {
  if (machine) {
    return machine;
  }

  const overrides = normalizeContextOverrides(contextOverrides);
  const deps = normalizeDependencies(dependencies);
  const hookSet = normalizeHooks(hooks);

  const { context } = resolveMachineContext(overrides, deps);
  const onEnterMap = createOnEnterMap();
  const onTransition = createTransitionHook(hookSet);

  try {
    machine = { context };
    const createdMachine = await createStateManager(onEnterMap, context, onTransition);
    machine = createdMachine;
  } catch (error) {
    machine = null;
    throw error;
  }

  attachListeners(machine);
  preloadDependencies();
  return machine;
}

// Map resolution events to PRD outcomes.
// Identity mappings are listed explicitly so only recognized events emit taxonomy outcomes.
const interruptResolutionMap = {
  restartRound: "restartRound", // explicit for consistency
  resumeLobby: "resumeLobby",
  abortMatch: "abortMatch",
  restartMatch: "restartRound", // closest PRD outcome
  toLobby: "resumeLobby"
};

/**
 * Emit diagnostic events on transitions.
 *
 * @pseudocode
 * 1. Emit `debug.transition` with `{ from, to, trigger:event }`.
 * 2. Fetch a state snapshot and emit `debug.state.snapshot`.
 * 3. Swallow errors to keep transitions deterministic.
 *
 * @param {string|null} from - Previous state.
 * @param {string} to - New state.
 * @param {string|null} event - Triggering event.
 */
function emitDiagnostics(from, to, event) {
  try {
    emitBattleEvent("debug.transition", { from, to, trigger: event });
    const snap = getStateSnapshot();
    emitBattleEvent("debug.state.snapshot", { state: snap?.state || to, context: snap || {} });
  } catch {
    // ignore: debug events are best effort
  }
}

/**
 * Emit readiness control events.
 *
 * @pseudocode
 * 1. When entering `matchStart`, emit `control.readiness.required` for `match`.
 * 2. On `ready` events, emit `control.readiness.confirmed` with scope `match|round`.
 *
 * @param {string|null} from - Previous state.
 * @param {string} to - New state.
 * @param {string|null} event - Triggering event.
 */
function emitReadiness(from, to, event) {
  if (to === "matchStart") {
    try {
      emitBattleEvent("control.readiness.required", { for: "match" });
    } catch {
      // ignore: readiness diagnostics are optional
    }
  }
  if (event === "ready") {
    const scope = from === "matchStart" ? "match" : "round";
    try {
      emitBattleEvent("control.readiness.confirmed", { for: scope });
    } catch {
      // ignore: readiness diagnostics are optional
    }
  }
}

/**
 * Emit authoritative state change events with context.
 *
 * @pseudocode
 * 1. Read engine context (`roundIndex`, `scores`, `seed`, `timerState`).
 * 2. Emit `control.state.changed` with `{ from, to, context, catalogVersion }`.
 *
 * @param {string|null} from - Previous state.
 * @param {string} to - New state.
 */
function emitStateChange(from, to) {
  try {
    const engine = machine?.context?.engine;
    const context = {
      roundIndex: Number(engine?.getRoundsPlayed?.() || 0),
      scores: engine?.getScores?.() || { playerScore: 0, opponentScore: 0 },
      seed: engine?.getSeed?.(),
      timerState: engine?.getTimerState?.() || null
    };

    // Debug logging for state changes
    logStateTransition(from, to, null, {
      context,
      engine: !!engine,
      machineState: machine?.currentState
    });

    // Mirror timer state for tests/diagnostics
    if (context.timerState) {
      try {
        // Also write onto the shared store for tests that spy on debug hooks
        try {
          const s = machine?.context?.store;
          if (s && typeof s === "object") s.classicBattleTimerState = context.timerState;
        } catch {}
        if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
          globalThis.__classicBattleDebugExpose("classicBattleTimerState", context.timerState);
        } else {
          debugHooks.exposeDebugState("classicBattleTimerState", context.timerState);
        }
      } catch {}
    }
    emitBattleEvent("control.state.changed", {
      from,
      to,
      context,
      catalogVersion: stateCatalog?.version || "v1"
    });
  } catch {
    // ignore: state change events should not block transitions
  }
}

/**
 * Mirror the engine timer state into debug hooks for tests and diagnostics.
 *
 * @pseudocode
 * 1. Read `engine` from the current machine context.
 * 2. If `engine.getTimerState` exists, call it and expose the result via
 *    `exposeDebugState('classicBattleTimerState', state)`.
 * 3. Swallow errors to keep transitions resilient.
 *
 * @returns {void}
 */
function mirrorTimerState() {
  try {
    const engine = machine?.context?.engine;
    const state = typeof engine?.getTimerState === "function" ? engine.getTimerState() : undefined;
    if (state) {
      // Also write onto the shared store for tests that spy on debug hooks
      try {
        const s = machine?.context?.store;
        if (s && typeof s === "object") s.classicBattleTimerState = state;
      } catch {}
      if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
        try {
          globalThis.__classicBattleDebugExpose("classicBattleTimerState", state);
        } catch {}
      } else {
        debugHooks.exposeDebugState("classicBattleTimerState", state);
      }
    }
  } catch {
    // ignore: timer state exposure is best-effort for tests
  }
}

/**
 * Emit interrupt resolution taxonomy events.
 *
 * @pseudocode
 * 1. Look up `event` in `interruptResolutionMap`.
 * 2. When a mapping exists, emit `interrupt.resolved` with `{ outcome }`.
 *
 * @param {string|null} event - Triggering event.
 */
function emitResolution(event) {
  try {
    const outcome = interruptResolutionMap[event];
    if (outcome) emitBattleEvent("interrupt.resolved", { outcome });
  } catch {
    // ignore: taxonomy events are non-critical
  }
}

/**
 * Preload non-critical dependencies required before machine start.
 *
 * @pseudocode
 * 1. Await `preloadTimerUtils`.
 * 2. Initialize `initScoreboardAdapter`.
 * 3. Swallow errors from each step.
 *
 * @returns {Promise<void>} resolves when best-effort preloads finish.
 */
async function preloadDependencies() {
  try {
    await preloadTimerUtils();
  } catch {}
  try {
    initScoreboardAdapter();
  } catch {}
}

/**
 * Map battle states to their `onEnter` handlers.
 *
 * @pseudocode
 * 1. Return an object mapping state names to handlers.
 * 2. Handlers are imported from `orchestratorHandlers.js`.
 *
 * @returns {Record<string, Function>} state-to-handler map.
 */
function createOnEnterMap() {
  return {
    waitingForMatchStart: waitingForMatchStartEnter,
    matchStart: matchStartEnter,
    cooldown: cooldownEnter,
    roundStart: roundStartEnter,
    waitingForPlayerAction: waitingForPlayerActionEnter,
    roundDecision: roundDecisionEnter,
    roundOver: roundOverEnter,
    matchDecision: matchDecisionEnter,
    matchOver: matchOverEnter,
    interruptRound: interruptRoundEnter,
    interruptMatch: interruptMatchEnter,
    roundModification: roundModificationEnter
  };
}

/**
 * Attach listeners and expose debug helpers for a battle machine.
 *
 * @pseudocode
 * 1. Register DOM and debug listeners for `battleStateChange`.
 * 2. Emit initial state, snapshot, and catalog events.
 * 3. Expose debug getters and handle visibility, timer drift, and injected errors.
 * 4. Swallow non-critical errors to keep setup resilient.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 */
function attachListeners(machineRef) {
  debugLogListener = createDebugLogListener(machineRef);
  onBattleEvent("battleStateChange", domStateListener);
  onBattleEvent("battleStateChange", debugLogListener);
  const initialDetail = { from: null, to: machineRef.getState(), event: "init" };
  domStateListener({ detail: initialDetail });
  debugLogListener({ detail: initialDetail });
  try {
    const snap = getStateSnapshot();
    emitBattleEvent("debug.state.snapshot", {
      state: snap?.state || machineRef.getState(),
      context: snap || {}
    });
  } catch {
    // ignore: snapshot diagnostics are best effort
  }
  try {
    emitBattleEvent("control.state.catalog", stateCatalog);
  } catch {
    // ignore: catalog event is informational
  }
  debugHooks.exposeDebugState("getClassicBattleMachine", () => machineRef);
  if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
    globalThis.__classicBattleDebugExpose("getClassicBattleMachine", () => machineRef);
  }
  if (typeof document !== "undefined") {
    visibilityHandler = () => {
      const engine = machineRef.context?.engine;
      if (engine) document.hidden ? engine.handleTabInactive() : engine.handleTabActive();
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }
  const engine = machineRef.context?.engine;
  if (engine) {
    engine.onTimerDrift = (drift) => {
      emitBattleEvent("scoreboardShowMessage", `Timer drift detected: ${drift}s. Timer reset.`);
      emitBattleEvent("debugPanelUpdate");
      engine.handleTimerDrift(drift);
    };
    // Expose initial timer state for tests/diagnostics
    try {
      const ts = typeof engine.getTimerState === "function" ? engine.getTimerState() : null;
      if (ts) {
        try {
          const s = machineRef?.context?.store;
          if (s && typeof s === "object") s.classicBattleTimerState = ts;
        } catch {}
        try {
          if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
            globalThis.__classicBattleDebugExpose("classicBattleTimerState", ts);
          } else {
            debugHooks.exposeDebugState("classicBattleTimerState", ts);
          }
        } catch {}
      }
    } catch {}
    if (typeof window !== "undefined") {
      window.injectClassicBattleError = (msg) => {
        engine.injectError(msg);
        emitBattleEvent("scoreboardShowMessage", `Injected error: ${msg}`);
        emitBattleEvent("debugPanelUpdate");
        machineRef.dispatch("interruptMatch", { reason: msg });
      };
    }
  }
  if (typeof window !== "undefined") {
    window.getBattleStateSnapshot = () => {
      try {
        return getStateSnapshot();
      } catch {
        return { state: null, prev: null, event: null, log: [] };
      }
    };
  }
}

/**
 * Dispose listeners and clear the classic battle orchestrator reference.
 *
 * @pseudocode
 * 1. Remove `battleStateChange` listeners (DOM & debug).
 * 2. Detach `visibilitychange` handler when present.
 * 3. Nullify internal references (`debugLogListener`, `visibilityHandler`, `machine`).
 *
 * @returns {void}
 */
export function disposeClassicBattleOrchestrator() {
  offBattleEvent("battleStateChange", domStateListener);
  if (debugLogListener) {
    offBattleEvent("battleStateChange", debugLogListener);
    debugLogListener = null;
  }
  if (typeof document !== "undefined" && visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
  machine = null;
}

/**
 * Get the current battle state machine instance for tests and helpers.
 *
 * @pseudocode
 * 1. Return the internal `machine` reference.
 *
 * @returns {import('./stateManager.js').ClassicBattleStateManager|null} Current machine instance or null.
 */
export function getBattleStateMachine() {
  if (typeof console !== "undefined") {
    console.log("[TEST DEBUG] getBattleStateMachine TOP, machine:", machine);
  }
  return machine;
}

// Re-export for test compatibility
/**
 * Dispatches an event to the classic battle state machine.
 *
 * @summary A thin re-export of the `dispatchBattleEvent` function from the
 * `eventDispatcher` module. This allows other modules to dispatch events
 * without directly depending on the state machine implementation.
 *
 * @pseudocode
 * 1. Import `dispatchBattleEvent` from `./eventDispatcher.js`.
 * 2. Re-export it for external use.
 *
 * @param {string} eventName - The name of the event to dispatch.
 * @param {any} [payload] - Optional data to pass with the event.
 * @returns {Promise<any>|void} Result of the dispatch when available.
 */
export { dispatchBattleEvent };
