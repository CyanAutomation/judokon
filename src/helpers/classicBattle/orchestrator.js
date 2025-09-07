import { createStateManager } from "./stateManager.js";
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
import { exposeDebugState } from "./debugHooks.js";
import { preloadTimerUtils } from "../TimerController.js";
import stateCatalog from "./stateCatalog.js";
import { initScoreboardAdapter } from "./scoreboardAdapter.js";

let machine = null;
let debugLogListener = null;
let visibilityHandler = null;

// Map resolution events to PRD outcomes
const interruptResolutionMap = {
  restartRound: "restartRound",
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
  } catch {}
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
    } catch {}
  }
  if (event === "ready") {
    const scope = from === "matchStart" ? "match" : "round";
    try {
      emitBattleEvent("control.readiness.confirmed", { for: scope });
    } catch {}
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
    emitBattleEvent("control.state.changed", {
      from,
      to,
      context,
      catalogVersion: stateCatalog?.version || "v1"
    });
  } catch {}
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
  } catch {}
}

/**
 * Dispatch an event to the active battle machine.
 *
 * @pseudocode
 * 1. Exit early when no machine is registered.
 * 2. Attempt to dispatch `eventName` with optional `payload` on the machine.
 * 3. If dispatch throws:
 *    a. Swallow the error to prevent cascading failures.
 *    b. Emit `debugPanelUpdate` so UI diagnostics can react.
 *
 * @param {string} eventName - Event to send to the machine.
 * @param {any} [payload] - Optional event payload.
 * @returns {Promise<any>|void} Result of the dispatch when available.
 */
/**
 * Dispatch an event to the active battle machine.
 *
 * Safe wrapper around `machine.dispatch` that early-returns when no
 * machine is available and emits diagnostic events on failure.
 *
 * @pseudocode
 * 1. Return early when no `machine` exists.
 * 2. If `eventName` is `interrupt`, emit `interrupt.requested` with scope.
 * 3. Attempt to `await machine.dispatch(eventName, payload)`.
 * 4. On dispatch failure, emit a `debugPanelUpdate` event.
 *
 * @param {string} eventName - Event to send to the machine.
 * @param {any} [payload] - Optional event payload.
 * @returns {Promise<any>|void} Result of the dispatch when available.
 */
export async function dispatchBattleEvent(eventName, payload) {
  if (!machine) return;
  try {
    // PRD taxonomy: emit interrupt.requested with payload context
    if (eventName === "interrupt") {
      try {
        const scope =
          payload?.scope || (machine?.getState?.() === "matchStart" ? "match" : "round");
        emitBattleEvent("interrupt.requested", { scope, reason: payload?.reason });
      } catch {}
    }
    return await machine.dispatch(eventName, payload);
  } catch {
    try {
      emitBattleEvent("debugPanelUpdate");
    } catch {}
  }
}

/**
 * Expose timer state for debugging when an engine exists.
 *
 * @pseudocode
 * 1. Return early when not in a browser or when no engine is present.
 * 2. Read timer state from the machine's engine.
 * 3. Mirror the timer state via `exposeDebugState('classicBattleTimerState')`.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager|null} machineRef - Current battle machine.
 * @returns {void}
 */
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
  // Preload timer utils early to avoid dynamic import on hot-path timer starts
  try {
    await preloadTimerUtils();
  } catch {}
  // Ensure UI service listeners are bound before emitting any init events
  try {
    await import("./uiService.js");
  } catch {}
  // Initialize Scoreboard adapter to listen for display.* events (no-op if none)
  try {
    initScoreboardAdapter();
  } catch {}
  const { resetGame: resetGameOpt, startRound: startRoundOpt, onStateChange } = opts;
  const doResetGame = typeof resetGameOpt === "function" ? resetGameOpt : resetGameLocal;
  const doStartRound = typeof startRoundOpt === "function" ? startRoundOpt : startRoundLocal;
  const context = { store, doResetGame, doStartRound, startRoundWrapper };
  const onEnter = {
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

  const onTransition = ({ from, to, event }) => {
    onStateChange?.({ from, to, event });
    emitBattleEvent("battleStateChange", { from, to, event });
    emitDiagnostics(from, to, event);
    emitReadiness(from, to, event);
    emitStateChange(from, to);
    emitResolution(event);
  };

  machine = await createStateManager(onEnter, context, onTransition);

  debugLogListener = createDebugLogListener(machine);

  onBattleEvent("battleStateChange", domStateListener);
  onBattleEvent("battleStateChange", debugLogListener);

  const initialDetail = {
    from: null,
    to: machine.getState(),
    event: "init"
  };
  domStateListener({ detail: initialDetail });
  debugLogListener({ detail: initialDetail });
  try {
    const snap = getStateSnapshot();
    emitBattleEvent("debug.state.snapshot", {
      state: snap?.state || machine.getState(),
      context: snap || {}
    });
  } catch {}

  // Broadcast State Catalog once for passive consumers
  try {
    emitBattleEvent("control.state.catalog", stateCatalog);
  } catch {}

  // Expose a safe getter for the running machine to avoid import cycles
  // in hot-path modules (e.g., selection handling).
  exposeDebugState("getClassicBattleMachine", () => machine);

  if (typeof document !== "undefined") {
    visibilityHandler = () => {
      if (machine?.context?.engine) {
        if (document.hidden) {
          machine.context.engine.handleTabInactive();
        } else {
          machine.context.engine.handleTabActive();
        }
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }

  if (machine?.context?.engine) {
    machine.context.engine.onTimerDrift = (driftAmount) => {
      emitBattleEvent(
        "scoreboardShowMessage",
        `Timer drift detected: ${driftAmount}s. Timer reset.`
      );
      emitBattleEvent("debugPanelUpdate");
      machine.context.engine.handleTimerDrift(driftAmount);
    };
  }

  if (typeof window !== "undefined" && machine?.context?.engine) {
    window.injectClassicBattleError = (errorMsg) => {
      machine.context.engine.injectError(errorMsg);
      emitBattleEvent("scoreboardShowMessage", `Injected error: ${errorMsg}`);
      emitBattleEvent("debugPanelUpdate");
      machine.dispatch("interruptMatch", { reason: errorMsg });
    };
  }

  try {
    if (typeof window !== "undefined") {
      // Expose a snapshot helper for tests/debuggers
      window.getBattleStateSnapshot = () => {
        try {
          return getStateSnapshot();
        } catch {
          return { state: null, prev: null, event: null, log: [] };
        }
      };
    }
  } catch {}
  return machine;
}

/**
 * Dispose listeners and clear the classic battle orchestrator reference.
 *
 * @pseudocode
 * 1. Remove `battleStateChange` listeners.
 * 2. Detach `visibilitychange` handler.
 * 3. Nullify stored references.
 */
export function disposeClassicBattleOrchestrator() {
  /**
   * Remove listeners and clear orchestrator references.
   *
   * @pseudocode
   * 1. Remove `domStateListener` from `battleStateChange`.
   * 2. If `debugLogListener` exists, remove it and null the reference.
   * 3. Detach `visibilitychange` listener when present.
   * 4. Null the `machine` reference so the orchestrator is disposable.
   * @returns {void}
   */
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
