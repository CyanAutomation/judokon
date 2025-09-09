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

let machine = null;
let debugLogListener = null;
let visibilityHandler = null;

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
 * 2. Dynamically import `./uiService.js`.
 * 3. Initialize `initScoreboardAdapter`.
 * 4. Swallow errors from each step.
 *
 * @returns {Promise<void>} resolves when best-effort preloads finish.
 */
async function preloadDependencies() {
  try {
    const mod = await import("../TimerController.js");
    await mod.preloadTimerUtils();
  } catch {
    // ignore: timer utilities are optional preloads
  }
  try {
    await import("./uiService.js");
  } catch {
    // ignore: UI service preload is optional
  }
  try {
    const { initScoreboardAdapter } = await import("./scoreboardAdapter.js");
    initScoreboardAdapter();
  } catch {
    // ignore: scoreboard adapter preload is optional
  }
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
 * Initialize the classic battle orchestrator. This function sets up the battle state machine,
 * defines its transition behavior, and exposes debugging utilities.
 *
 * @pseudocode
 * 1. Destructure `resetGame`, `startRound`, and `onStateChange` from `opts`, falling back to local implementations if not provided.
 * 2. Create a `context` object containing the `store`, resolved `doResetGame`, `doStartRound`, and `startRoundWrapper`.
 * 3. Define the `onEnter` object mapping state names to their respective handler functions.
 * 4. Define the `onTransition` function executed on every state change:
 *    a. Call `onStateChange({ from, to, event })` when provided.
 *    b. Emit a `"battleStateChange"` battle event with `{ from, to, event }`.
 * 5. Create the battle state manager via `createStateManager` and store it.
 * 6. Register state transition listeners for DOM updates, debug logging, and waiter resolution.
 * 7. Emit an initial `"battleStateChange"` event so listeners mirror the starting state.
 * 8. Expose a getter for the machine, wire visibility listeners, and handle timer drift and injected errors.
 * 9. Expose `getBattleStateSnapshot` on `window` for debugging.
 * 10. Return the initialized machine.
 *
 * @param {object} store - Shared battle store.
 * @param {Function} startRoundWrapper - Optional wrapper for starting a round.
 * @param {object} [opts] - Optional overrides.
 * @param {Function} [opts.resetGame] - Custom reset handler.
 * @param {Function} [opts.startRound] - Custom round start handler.
 * @param {(args: {from: string|null, to: string, event: string|null}) => void} [opts.onStateChange]
 *   Optional callback invoked on every state change.
 * @returns {Promise<void>} Resolves when setup completes.
 */
export async function initClassicBattleOrchestrator(store, startRoundWrapper, opts = {}) {
  await preloadDependencies();
  const { resetGame: resetGameOpt, startRound: startRoundOpt, onStateChange } = opts;
  const doResetGame = typeof resetGameOpt === "function" ? resetGameOpt : resetGameLocal;
  const doStartRound = typeof startRoundOpt === "function" ? startRoundOpt : startRoundLocal;
  const context = { store, doResetGame, doStartRound, startRoundWrapper };
  const onEnter = createOnEnterMap();

  const onTransition = ({ from, to, event }) => {
    // Ignore the machine's synthetic init transition; listeners are
    // primed separately in attachListeners() with an initial snapshot.
    if (event === "init") return;
    onStateChange?.({ from, to, event });
    emitBattleEvent("battleStateChange", { from, to, event });
    emitDiagnostics(from, to, event);
    emitReadiness(from, to, event);
    emitStateChange(from, to);
    mirrorTimerState();
    emitResolution(event);
  };

  const { createStateManager } = await import("./stateManager.js");
  machine = await createStateManager(onEnter, context, onTransition);
  attachListeners(machine);
  // Prime timer state exposure for tests/diagnostics
  try {
    mirrorTimerState();
  } catch {}
  return machine;
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
  return machine;
}
