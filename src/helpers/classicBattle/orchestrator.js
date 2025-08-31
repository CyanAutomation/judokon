import { createStateManager } from "./stateManager.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;
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
import { emitBattleEvent, onBattleEvent } from "./battleEvents.js";
import { setMachine } from "./eventDispatcher.js";
import {
  domStateListener,
  createDebugLogListener,
  createWaiterResolver
} from "./stateTransitionListeners.js";
import { getStateSnapshot } from "./battleDebug.js";
import { exposeDebugState } from "./debugHooks.js";

let machine = null;

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
 * 5. Create the battle state manager via `createStateManager` and store it with `setMachine`.
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
  };

  machine = await createStateManager(onEnter, context, onTransition);
  setMachine(machine);

  const debugLogListener = createDebugLogListener(machine);
  const waiterResolver = createWaiterResolver();

  onBattleEvent("battleStateChange", domStateListener);
  onBattleEvent("battleStateChange", debugLogListener);
  onBattleEvent("battleStateChange", waiterResolver);

  const initialDetail = {
    from: null,
    to: machine.getState(),
    event: "init"
  };
  domStateListener({ detail: initialDetail });
  debugLogListener({ detail: initialDetail });
  waiterResolver({ detail: initialDetail });

  // Expose a safe getter for the running machine to avoid import cycles
  // in hot-path modules (e.g., selection handling).
  try {
<<<<<<< HEAD
    if (typeof window !== "undefined") {
      window.__getClassicBattleMachine = machine;
    }
=======
    exposeDebugState("getClassicBattleMachine", () => machine);
>>>>>>> 00f2d6693778baec7f8a06534f64d57ecd5dac70
  } catch {}

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (machine?.context?.engine) {
        if (document.hidden) {
          machine.context.engine.handleTabInactive();
        } else {
          machine.context.engine.handleTabActive();
        }
      }
    });
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
  console.log('initClassicBattleOrchestrator completed');
  return machine;
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
