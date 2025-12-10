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
import { setBattleStateGetter, resetEventBus } from "./eventBus.js";
import { domStateListener, createDebugLogListener } from "./stateTransitionListeners.js";
import { getStateSnapshot } from "./battleDebug.js";
import * as debugHooks from "./debugHooks.js";
import stateCatalog from "./stateCatalog.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { logStateTransition } from "./debugLogger.js";
import { preloadTimerUtils } from "../TimerController.js";
import { initScoreboardAdapter } from "./scoreboardAdapter.js";
import { initPreloadServices } from "./preloadService.js";
import { createStateManager } from "./stateManager.js";
import "./uiService.js";
import { debugLog } from "./debugLog.js";

let machine = null;
let machineInitPromise = null;
let debugLogListener = null;
let visibilityHandler = null;
let timerEventHandlers = {};

/**
 * Check if an object appears to be a battle store.
 *
 * @param {any} candidate - Object to check.
 * @returns {boolean} True if the object has battle store properties.
 * @summary Determine if an object is a battle store by checking for key properties.
 * @pseudocode
 * 1. Check if candidate is an object.
 * 2. Verify it has battle store properties like selectionMade, stallTimeoutMs, or playerChoice.
 * 3. Return true if it appears to be a battle store, false otherwise.
 */
function isBattleStore(candidate) {
  if (!candidate || typeof candidate !== "object") return false;
  return (
    Object.prototype.hasOwnProperty.call(candidate, "selectionMade") ||
    Object.prototype.hasOwnProperty.call(candidate, "stallTimeoutMs") ||
    Object.prototype.hasOwnProperty.call(candidate, "playerChoice")
  );
}

/**
 * Normalize context overrides to ensure consistent structure.
 *
 * @param {any} contextOverrides - Raw context overrides.
 * @returns {object} Normalized context overrides.
 * @summary Convert various override formats into a consistent object structure.
 * @pseudocode
 * 1. Check if contextOverrides is a valid object.
 * 2. If it's a battle store object, wrap it in a store property.
 * 3. Return the normalized overrides object.
 */
function normalizeContextOverrides(contextOverrides) {
  if (!contextOverrides || typeof contextOverrides !== "object") {
    return {};
  }
  if (isBattleStore(contextOverrides) && !("store" in contextOverrides)) {
    return { store: contextOverrides };
  }
  return { ...contextOverrides };
}

/**
 * Normalize dependencies to ensure consistent structure.
 *
 * @param {any} dependencies - Raw dependencies.
 * @returns {object} Normalized dependencies.
 * @summary Convert various dependency formats into a consistent object structure.
 * @pseudocode
 * 1. Check if dependencies is provided.
 * 2. If it's a function, treat it as a startRoundWrapper.
 * 3. Return the normalized dependencies object.
 */
function normalizeDependencies(dependencies) {
  if (!dependencies) return {};
  if (typeof dependencies === "function") {
    return { startRoundWrapper: dependencies };
  }
  return { ...dependencies };
}

/**
 * Normalize hooks to ensure consistent structure.
 *
 * @param {any} hooks - Raw hooks.
 * @returns {object} Normalized hooks.
 * @summary Convert various hook formats into a consistent object structure.
 * @pseudocode
 * 1. Check if hooks is provided.
 * 2. If it's a function, treat it as an onStateChange hook.
 * 3. Return the normalized hooks object.
 */
function normalizeHooks(hooks) {
  if (!hooks) return {};
  if (typeof hooks === "function") {
    return { onStateChange: hooks };
  }
  return hooks;
}

/**
 * Apply reset game functionality to the context.
 *
 * @param {object} context - Machine context object.
 * @param {object} store - Battle store.
 * @param {object} deps - Dependencies.
 * @summary Set up the doResetGame function in the context.
 * @pseudocode
 * 1. Check if doResetGame is already in context.
 * 2. Try to use deps.resetGame if available.
 * 3. Fall back to resetGameLocal with the store.
 * 4. Use deps.resetGame as last resort.
 */
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

/**
 * Select the appropriate start round dependency function.
 *
 * @param {object} deps - Dependencies object.
 * @returns {Function|null} The selected start round function or null.
 * @summary Choose the correct start round function from dependencies.
 * @pseudocode
 * 1. Check for doStartRound in dependencies first.
 * 2. Fall back to startRound if available.
 * 3. Return null if no suitable function found.
 */
function selectStartRoundDependency(deps) {
  if (typeof deps.doStartRound === "function") return deps.doStartRound;
  if (typeof deps.startRound === "function") return deps.startRound;
  return null;
}

/**
 * Apply start round functionality to the context.
 *
 * @param {object} context - Machine context object.
 * @param {object} store - Battle store.
 * @param {object} deps - Dependencies.
 * @summary Set up the doStartRound function in the context.
 * @pseudocode
 * 1. Check if doStartRound is already in context.
 * 2. Select the appropriate start round dependency.
 * 3. Create a wrapper function that calls the dependency with the correct store.
 * 4. Fall back to startRoundLocal if no dependency found.
 */
function applyStartRound(context, store, deps) {
  if ("doStartRound" in context) return;
  const startRoundDep = selectStartRoundDependency(deps);
  if (startRoundDep) {
    context.doStartRound = (activeStore) => startRoundDep(activeStore ?? context.store ?? store);
    return;
  }
  if (store) {
    context.doStartRound = (activeStore) => startRoundLocal(activeStore ?? context.store ?? store);
  }
}

/**
 * Resolve the complete machine context from overrides and dependencies.
 *
 * @param {object} overrides - Context overrides.
 * @param {object} deps - Dependencies.
 * @returns {object} Object containing the resolved context.
 * @summary Build the complete machine context by merging overrides and dependencies.
 * @pseudocode
 * 1. Extract store, scheduler, and other key components from overrides and deps.
 * 2. Build the context object with all necessary properties.
 * 3. Apply reset game and start round functionality.
 * 4. Update the store's context if available.
 * 5. Return the resolved context.
 */
function resolveMachineContext(overrides, deps) {
  const store = overrides.store ?? deps.store ?? null;
  const scheduler = overrides.scheduler ?? deps.scheduler ?? null;
  const startRoundWrapper = overrides.startRoundWrapper ?? deps.startRoundWrapper ?? null;
  const stateTable = overrides.stateTable ?? deps.stateTable ?? null;

  if (!store) {
    debugLog("Warning: resolveMachineContext - no store provided");
  }
  if (!scheduler) {
    debugLog("Warning: resolveMachineContext - no scheduler provided");
  }

  const context = { ...overrides };
  if (!("store" in context)) context.store = store;
  if (scheduler && !("scheduler" in context)) context.scheduler = scheduler;
  if (!("engine" in context)) {
    context.engine = overrides.engine ?? deps.engine ?? store?.engine ?? null;
  }
  if (startRoundWrapper && !("startRoundWrapper" in context)) {
    context.startRoundWrapper = startRoundWrapper;
  }
  if (stateTable && !("stateTable" in context)) {
    context.stateTable = stateTable;
  }

  applyResetGame(context, store, deps);
  applyStartRound(context, store, deps);

  if (store && typeof store === "object") {
    store.context = { ...(store.context || {}), ...context };
  }

  return { context };
}

/**
 * Create a transition hook that handles state changes.
 *
 * @param {object} hookSet - Set of hooks to execute.
 * @returns {Function} The transition hook function.
 * @summary Create a function that executes on every state transition.
 * @pseudocode
 * 1. Return an async function that receives transition details.
 * 2. Emit battle state change event with transition details.
 * 3. Execute the onStateChange hook if provided.
 * 4. Emit diagnostic, readiness, and state change events.
 * 5. Mirror timer state and emit resolution events.
 */
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
  debugLog("initClassicBattleOrchestrator() called");
  window.__INIT_ORCHESTRATOR_CALLED = true;
  if (machine) {
    window.__ORCHESTRATOR_EARLY_RETURN_MACHINE = true;
    // Capture where this is being called from
    if (typeof new Error().stack !== "undefined") {
      const stack = new Error().stack;
      const lines = stack.split("\n").slice(0, 5);
      window.__ORCHESTRATOR_EARLY_RETURN_STACK = lines.join(" | ");
    }
    return machine;
  }

  if (machineInitPromise) {
    window.__ORCHESTRATOR_EARLY_RETURN_PROMISE = true;
    debugLog("initClassicBattleOrchestrator: already initializing, returning machineInitPromise");
    return machineInitPromise;
  }
  window.__ORCHESTRATOR_STARTING_INIT = true;
  machineInitPromise = (async () => {
    const overrides = normalizeContextOverrides(contextOverrides);
    const deps = normalizeDependencies(dependencies);
    const hookSet = normalizeHooks(hooks);

    const { context } = resolveMachineContext(overrides, deps);
    const onEnterMap = createOnEnterMap();
    const onTransition = createTransitionHook(hookSet);

    try {
      const createdMachine = await createStateManager(
        onEnterMap,
        context,
        onTransition,
        context.stateTable
      );
      machine = createdMachine;
      attachListeners(machine);
      // Register the machine's state getter so eventBus can access current state
      const initialState = machine.getState();
      window.__ORCHESTRATOR_INITIAL_STATE = initialState;
      setBattleStateGetter(() => machine.getState());
      preloadDependencies();
      return machine;
    } catch (error) {
      machine = null;
      debugLog("initClassicBattleOrchestrator: failed to initialize state manager", error);
      throw error;
    } finally {
      machineInitPromise = null;
    }
  })();

  return machineInitPromise;
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
 * Expose timer state to debug hooks and shared store for test inspection.
 *
 * @param {any} timerState - The timer state to expose.
 * @summary Write timer state to shared store and expose via debug hooks.
 * @pseudocode
 * 1. Check if timerState is provided.
 * 2. Write to machine context store if available.
 * 3. Expose via globalThis debug function or debugHooks.
 * 4. Swallow errors to keep transitions resilient.
 */
function exposeTimerStateForDebugging(timerState) {
  if (!timerState) return;
  try {
    const s = machine?.context?.store;
    if (s && typeof s === "object") s.classicBattleTimerState = timerState;
  } catch {}
  try {
    if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
      globalThis.__classicBattleDebugExpose("classicBattleTimerState", timerState);
    } else {
      debugHooks.exposeDebugState("classicBattleTimerState", timerState);
    }
  } catch {}
}

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
    exposeTimerStateForDebugging(context.timerState);
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
 * 2. If `engine.getTimerState` exists, call it and expose via `exposeTimerStateForDebugging`.
 * 3. Swallow errors to keep transitions resilient.
 *
 * @returns {void}
 */
function mirrorTimerState() {
  try {
    const engine = machine?.context?.engine;
    const state = typeof engine?.getTimerState === "function" ? engine.getTimerState() : undefined;
    exposeTimerStateForDebugging(state);
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
  try {
    initPreloadServices();
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
 * Setup listener for readyForCooldown event to dispatch 'ready' outside dispatch context.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 */
function setupReadyForCooldownListener(machineRef) {
  debugLog("setupReadyForCooldownListener: Setting up readyForCooldown listener");
  onBattleEvent("readyForCooldown", (event) => {
    debugLog("readyForCooldown-listener: CALLED");
    const detail = event?.detail ?? {};
    try {
      machineRef.dispatch("ready", detail);
      debugLog("readyForCooldown-listener: dispatch('ready') completed");
    } catch (error) {
      debugLog("readyForCooldown-listener: dispatch('ready') threw error:", error);
    }
  });
  debugLog("setupReadyForCooldownListener: listener setup complete");
}

/**
 * Setup state change listeners and emit initial diagnostics.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 */
function setupStateChangeListeners(machineRef) {
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
}

/**
 * Expose debug getters for accessing the machine and orchestrator state.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 */
function exposeDebugGetters(machineRef) {
  debugHooks.exposeDebugState("getClassicBattleMachine", () => machineRef);
  debugLog("orchestrator: exposing machineRef", machineRef);
  if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
    globalThis.__classicBattleDebugExpose("getClassicBattleMachine", () => machineRef);
  }
  try {
    // Record when the orchestrator exposed the getter so tests can correlate timing
    try {
      debugHooks.exposeDebugState("orchestrator_getter_exposed_at", Date.now());
    } catch {}
    try {
      if (typeof globalThis !== "undefined" && globalThis.__classicBattleDebugExpose) {
        globalThis.__classicBattleDebugExpose("orchestrator_getter_exposed_at", Date.now());
      }
    } catch {}
  } catch {}
}

/**
 * Setup visibility change handler for tab inactive/active events.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 */
function setupVisibilityHandler(machineRef) {
  if (typeof document !== "undefined") {
    visibilityHandler = () => {
      const engine = machineRef.context?.engine;
      if (engine) document.hidden ? engine.handleTabInactive() : engine.handleTabActive();
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }
}

/**
 * Setup timer event handlers for pause, resume, stop, drift, and tab visibility.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 * @param {any} engine - The battle engine.
 */
function setupTimerEventHandlers(machineRef, engine) {
  if (!engine) return;

  engine.onTimerDrift = (drift) => {
    emitBattleEvent("scoreboardShowMessage", "Waiting…");
    emitBattleEvent("debugPanelUpdate");
    engine.handleTimerDrift(drift);
  };

  // Listen to timer lifecycle events for UI updates and logging
  timerEventHandlers.onPaused = () => {
    emitBattleEvent("scoreboardShowMessage", "Timer paused");
  };
  engine.on("timerPaused", timerEventHandlers.onPaused);

  timerEventHandlers.onResumed = () => {
    emitBattleEvent("scoreboardShowMessage", "Timer resumed");
  };
  engine.on("timerResumed", timerEventHandlers.onResumed);

  timerEventHandlers.onStopped = () => {
    emitBattleEvent("scoreboardShowMessage", "Timer stopped");
  };
  engine.on("timerStopped", timerEventHandlers.onStopped);

  timerEventHandlers.onDriftRecorded = ({ driftAmount }) => {
    emitBattleEvent("scoreboardShowMessage", `Drift detected: ${driftAmount}s`);
  };
  engine.on("timerDriftRecorded", timerEventHandlers.onDriftRecorded);

  timerEventHandlers.onTabInactive = () => {
    emitBattleEvent("scoreboardShowMessage", "Page hidden - timer paused");
  };
  engine.on("tabInactive", timerEventHandlers.onTabInactive);

  timerEventHandlers.onTabActive = () => {
    emitBattleEvent("scoreboardShowMessage", "Page visible - timer resumed");
  };
  engine.on("tabActive", timerEventHandlers.onTabActive);
}

/**
 * Setup initial timer state exposure and error injection for engine.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 * @param {any} engine - The battle engine.
 */
function setupEngineDebugFeatures(machineRef, engine) {
  if (!engine) return;

  // Expose initial timer state for tests/diagnostics
  try {
    const ts = typeof engine.getTimerState === "function" ? engine.getTimerState() : null;
    exposeTimerStateForDebugging(ts);
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

/**
 * Setup global snapshot getter for test inspection.
 */
function setupSnapshotGetter() {
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
 * Attach listeners and expose debug helpers for a battle machine.
 *
 * @pseudocode
 * 1. Setup readyForCooldown listener and state change listeners.
 * 2. Expose debug getters and initial diagnostics.
 * 3. Setup visibility and timer event handlers.
 * 4. Setup engine debug features and snapshot getter.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager} machineRef
 */
function attachListeners(machineRef) {
  setupReadyForCooldownListener(machineRef);
  setupStateChangeListeners(machineRef);
  exposeDebugGetters(machineRef);
  setupVisibilityHandler(machineRef);
  const engine = machineRef.context?.engine;
  setupTimerEventHandlers(machineRef, engine);
  setupEngineDebugFeatures(machineRef, engine);
  setupSnapshotGetter();
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

  // Clean up timer event listeners
  const engine = machine?.context?.engine;
  if (engine && timerEventHandlers) {
    if (timerEventHandlers.onPaused) engine.off("timerPaused", timerEventHandlers.onPaused);
    if (timerEventHandlers.onResumed) engine.off("timerResumed", timerEventHandlers.onResumed);
    if (timerEventHandlers.onStopped) engine.off("timerStopped", timerEventHandlers.onStopped);
    if (timerEventHandlers.onDriftRecorded)
      engine.off("timerDriftRecorded", timerEventHandlers.onDriftRecorded);
    if (timerEventHandlers.onTabInactive)
      engine.off("tabInactive", timerEventHandlers.onTabInactive);
    if (timerEventHandlers.onTabActive) engine.off("tabActive", timerEventHandlers.onTabActive);
    timerEventHandlers = {};
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
  debugLog("getBattleStateMachine: returning existing machine", machine);
  return machine;
}

/**
 * Test-only: Reset the orchestrator state to allow fresh initialization.
 * Use in test teardown to clear module-level state between tests.
 *
 * @pseudocode
 * 1. Set `machine`, `machineInitPromise`, `debugLogListener`, `visibilityHandler`, and `timerEventHandlers` to null.
 * 2. Delete test-related properties from the global `window` object if it exists.
 *
 * @returns {void}
 */
export function resetOrchestratorForTest() {
  machine = null;
  machineInitPromise = null;
  debugLogListener = null;
  visibilityHandler = null;
  timerEventHandlers = {};
  resetEventBus();
  if (typeof window !== "undefined") {
    delete window.__ORCHESTRATOR_INITIAL_STATE;
    delete window.__INIT_ORCHESTRATOR_CALLED;
    delete window.__ORCHESTRATOR_EARLY_RETURN_MACHINE;
    delete window.__ORCHESTRATOR_EARLY_RETURN_PROMISE;
    delete window.__ORCHESTRATOR_STARTING_INIT;
  }
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

/**
 * Test-only export: Mirror the timer state from the engine to debug hooks.
 *
 * @pseudocode
 * 1. Retrieve timer state from engine.
 * 2. Write to shared store for test inspection.
 * 3. Expose via debug hooks (globalThis or debugHooks).
 *
 * @returns {void}
 */
export { mirrorTimerState as _mirrorTimerState };
