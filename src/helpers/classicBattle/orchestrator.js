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

let machine = null;
let debugLogListener = null;
let visibilityHandler = null;

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
    // PRD diagnostics: emit debug.transition and snapshot
    try {
      emitBattleEvent("debug.transition", { from, to, trigger: event });
      const snap = getStateSnapshot();
      emitBattleEvent("debug.state.snapshot", { state: snap?.state || to, context: snap || {} });
    } catch {}
    // PRD control: surface readiness requirement when entering matchStart
    if (to === "matchStart") {
      try {
        emitBattleEvent("control.readiness.required", { for: "match" });
      } catch {}
    }
    // PRD control: readiness confirmed on ready transitions
    if (event === "ready") {
      const forVal = from === "matchStart" ? "match" : "round";
      try {
        emitBattleEvent("control.readiness.confirmed", { for: forVal });
      } catch {}
    }

    // PRD control: authoritative state change event with minimal context
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

    // PRD taxonomy: emit interrupt.resolved on resolution triggers
    try {
      const resolutionMap = {
        restartRound: "restartRound",
        resumeLobby: "resumeLobby",
        abortMatch: "abortMatch",
        restartMatch: "restartRound", // closest PRD outcome
        toLobby: "resumeLobby"
      };
      const outcome = resolutionMap[event];
      if (outcome) emitBattleEvent("interrupt.resolved", { outcome });
    } catch {}
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
