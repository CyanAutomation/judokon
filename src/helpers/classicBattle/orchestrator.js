import { BattleStateMachine } from "./stateMachine.js";
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
import { emitBattleEvent } from "./battleEvents.js";
import { setMachine } from "./eventDispatcher.js";

let machine = null;
const stateWaiters = new Map();

/**
 * Wait for the battle state machine to enter a specific state.
 *
 * @pseudocode
 * 1. Return a new Promise that resolves when the target state is entered or rejects on timeout/error.
 * 2. Inside the Promise constructor (resolve, reject):
 *    a. Wrap the logic in a `try...catch` block to handle synchronous errors during setup.
 *    b. Check if `machine` exists and its current state (`machine.getState()`) is already `targetState`. If so, immediately resolve the Promise with `true` and return.
 *    c. Create an `entry` object with the `resolve` function of the current Promise.
 *    d. If `timeoutMs` is not `Infinity`:
 *       i. Set a `setTimeout` for `timeoutMs`.
 *       ii. In the timeout callback, call `removeWaiter` to clean up the entry and reject the Promise with a "timeout" error.
 *       iii. Store the timer ID on the `entry` object.
 *    e. Retrieve the array of waiters for `targetState` from `stateWaiters` (or create an empty array if none exists).
 *    f. Push the `entry` object into this array.
 *    g. Store the updated array back in `stateWaiters` for `targetState`.
 *    h. If any synchronous error occurs during this setup, catch it and reject the Promise with an "error" message.
 *
 * @param {string} targetState - State name to await.
 * @param {number} [timeoutMs=10000] - Reject after this many ms.
 * @returns {Promise<boolean>} Resolves when the state is entered.
 */
export function onStateTransition(targetState, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    try {
      if (machine?.getState?.() === targetState) {
        resolve(true);
        return;
      }
      const entry = { resolve };
      if (timeoutMs !== Infinity) {
        entry.timer = setTimeout(() => {
          try {
            const list = stateWaiters.get(targetState) || [];
            const idx = list.indexOf(entry);
            if (idx !== -1) list.splice(idx, 1);
            if (list.length === 0) stateWaiters.delete(targetState);
          } catch {}
          reject(new Error(`onStateTransition timeout for ${targetState}`));
        }, timeoutMs);
      }
      const arr = stateWaiters.get(targetState) || [];
      arr.push(entry);
      stateWaiters.set(targetState, arr);
    } catch {
      reject(new Error("onStateTransition setup error"));
    }
  });
}

/**
 * Initialize the classic battle orchestrator. This function sets up the battle state machine
 * and defines its transition behavior.
 *
 * @pseudocode
 * 1. Destructure `resetGame`, `startRound`, and `onStateChange` from `opts`, falling back to local implementations if not provided.
 * 2. Create a `context` object containing the `store`, resolved `doResetGame`, `doStartRound`, and `startRoundWrapper`.
 * 3. Define the `onEnter` object mapping state names to their respective handler functions.
 * 4. Define the `onTransition` function executed on every state change:
 *    a. Emit a `"battleStateChange"` battle event with `{ from, to, event }`.
 *    b. Emit a `"debugPanelUpdate"` battle event.
 *    c. Resolve any waiters queued for the new `to` state.
 *    d. Invoke the optional `onStateChange` callback with `{ from, to, event }`.
 * 5. Create the battle state machine via `BattleStateMachine.create` and store it with `setMachine`.
 * 6. Attach a timer drift handler if an engine is present.
 * 7. Return the initialized machine.
 *
 * @param {object} store - Shared battle store.
 * @param {Function} startRoundWrapper - Optional wrapper for starting a round.
 * @param {object} [opts] - Optional overrides.
 * @param {Function} [opts.resetGame] - Custom reset handler.
 * @param {Function} [opts.startRound] - Custom round start handler.
 * @param {Function} [opts.onStateChange] - Callback invoked on each state transition.
 * @returns {Promise<void>} Resolves when setup completes.
 */
export async function initClassicBattleOrchestrator(store, startRoundWrapper, opts = {}) {
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

  const onTransition = async ({ from, to, event }) => {
    emitBattleEvent("battleStateChange", { from, to, event });
    emitBattleEvent("debugPanelUpdate");
    const waiters = stateWaiters.get(to);
    if (waiters) {
      stateWaiters.delete(to);
      for (const w of waiters) {
        try {
          if (w.timer) clearTimeout(w.timer);
          w.resolve(true);
        } catch {}
      }
    }
    if (typeof onStateChange === "function") {
      try {
        onStateChange({ from, to, event });
      } catch {}
    }
  };

  machine = await BattleStateMachine.create(onEnter, context, onTransition);
  setMachine(machine);
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
  return machine;
}

/**
 * Dispatch an event to the currently running battle machine.
 * This small proxy is exported for backwards compatibility: some modules
 * import `dispatchBattleEvent` from this orchestrator file. Keep it
 * minimal and safe — if the machine isn't ready the call is a no-op.
 *
 * @pseudocode
 * 1. Check if the `machine` instance is null. If so, exit the function immediately as there's no machine to dispatch to.
 * 2. Attempt to dispatch the `eventName` with the `payload` to the `machine`.
 * 3. If an error occurs during dispatch:
 *    a. Catch the error to prevent cascading failures (higher-level code can still observe via emitted events).
 *    b. Attempt to emit a "debugPanelUpdate" battle event to inform UI debug panels of the failure.
 * 4. Return the result of the dispatch operation (if successful).
 *
 * @param {string} eventName
 * @param {any} payload
 */
export async function dispatchBattleEvent(eventName, payload) {
  if (!machine) return;
  try {
    return await machine.dispatch(eventName, payload);
  } catch {
    // swallow to avoid cascading startup failures; higher-level code
    // can still observe via emitted events or thrown errors if needed.
    try {
      // emit a debug event so UI debug panels can show the failure
      emitBattleEvent("debugPanelUpdate");
    } catch (innerError) {
      console.error("Failed to emit debugPanelUpdate event:", innerError);
    }
  }
}

/**
 * Get the current battle state machine instance for tests and helpers.
 * @returns {import('./stateMachine.js').BattleStateMachine|null}
 */
export function getBattleStateMachine() {
  return machine;
}
