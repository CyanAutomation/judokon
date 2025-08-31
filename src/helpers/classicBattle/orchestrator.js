import { BattleStateMachine } from "./stateMachine.js";
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
      // Debug bookkeeping for diagnostics (safe in browsers only)
      try {
        if (typeof window !== "undefined") {
          entry.__id = Math.random().toString(36).slice(2, 9);
          window.__stateWaiterEvents = window.__stateWaiterEvents || [];
          window.__stateWaiterEvents.push({
            action: "add",
            state: targetState,
            id: entry.__id,
            ts: Date.now()
          });
        }
      } catch {}
      if (timeoutMs !== Infinity) {
        entry.timer = setTimeout(() => {
          try {
            // remove this entry from the waiter list on timeout
            const list = stateWaiters.get(targetState) || [];
            const idx = list.indexOf(entry);
            if (idx !== -1) list.splice(idx, 1);
            if (list.length === 0) stateWaiters.delete(targetState);
            try {
              if (typeof window !== "undefined") {
                window.__stateWaiterEvents = window.__stateWaiterEvents || [];
                window.__stateWaiterEvents.push({
                  action: "timeout",
                  state: targetState,
                  id: entry.__id || null,
                  ts: Date.now()
                });
              }
            } catch {}
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
 * Expose timer state for debugging when an engine exists.
 *
 * @pseudocode
 * 1. Return early when not in a browser or when no engine is present.
 * 2. Read timer state from the machine's engine.
 * 3. Mirror the timer state on `window.__classicBattleTimerState`.
 *
 * @param {import("./stateMachine.js").BattleStateMachine|null} machineRef - Current battle machine.
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
 * 5. Create the battle state machine via `BattleStateMachine.create` and store it with `setMachine`.
 * 6. Register state transition listeners for DOM updates, debug logging, and waiter resolution.
 * 7. Expose a getter for the machine, wire visibility listeners, and handle timer drift and injected errors.
 * 8. Expose `onStateTransition` and `getBattleStateSnapshot` on `window` for debugging.
 * 9. Return the initialized machine.
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

  machine = await BattleStateMachine.create(onEnter, context, onTransition);
  setMachine(machine);

  onBattleEvent("battleStateChange", domStateListener);
  onBattleEvent("battleStateChange", createDebugLogListener(machine));
  onBattleEvent("battleStateChange", createWaiterResolver(stateWaiters));

  // Expose a safe getter for the running machine to avoid import cycles
  // in hot-path modules (e.g., selection handling).
  try {
    if (typeof window !== "undefined") {
      window.__getClassicBattleMachine = () => machine;
    }
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
      window.onStateTransition = onStateTransition;
      // Provide a robust in-page awaiter to avoid brittle DOM polling from tests
      if (!window.awaitBattleState) {
        window.awaitBattleState = (target, timeoutMs = 10000) =>
          new Promise((resolve, reject) => {
            try {
              if (window.__classicBattleState === target) return resolve(true);
              if (!window.__stateWaiters) window.__stateWaiters = {};
              const entry = { resolve };
              try {
                entry.__id = Math.random().toString(36).slice(2, 9);
                window.__stateWaiterEvents = window.__stateWaiterEvents || [];
                window.__stateWaiterEvents.push({
                  action: "add",
                  state: target,
                  id: entry.__id,
                  ts: Date.now()
                });
              } catch {}
              if (timeoutMs !== Infinity) {
                entry.timer = setTimeout(() => {
                  try {
                    window.__stateWaiterEvents = window.__stateWaiterEvents || [];
                    window.__stateWaiterEvents.push({
                      action: "timeout",
                      state: target,
                      id: entry.__id,
                      ts: Date.now()
                    });
                    const arr = window.__stateWaiters[target] || [];
                    const idx = arr.indexOf(entry);
                    if (idx !== -1) arr.splice(idx, 1);
                    if (arr.length === 0) delete window.__stateWaiters[target];
                  } catch {}
                  reject(new Error(`awaitBattleState timeout for ${target}`));
                }, timeoutMs);
              }
              const arr = window.__stateWaiters[target] || [];
              arr.push(entry);
              window.__stateWaiters[target] = arr;
            } catch {
              reject(new Error("awaitBattleState setup error"));
            }
          });
      }
      try {
        // expose a helper to dump current waiters for diagnostics
        // NOTE: Do not return functions or timers (non-serializable). Map to safe descriptors.
        window.dumpStateWaiters = () => {
          try {
            const raw = window.__stateWaiters || {};
            const waiters = {};
            for (const key of Object.keys(raw)) {
              try {
                const arr = Array.isArray(raw[key]) ? raw[key] : [];
                waiters[key] = arr.map((e) => ({
                  id: e && e.__id ? e.__id : null,
                  hasTimer: !!(e && e.timer)
                }));
              } catch {
                waiters[key] = [];
              }
            }
            return {
              waiters,
              events: window.__stateWaiterEvents || [],
              promiseEvents: window.__promiseEvents || []
            };
          } catch {
            return null;
          }
        };
      } catch {}
      // Expose a snapshot helper for tests/debuggers
      window.getBattleStateSnapshot = () => {
        try {
          return {
            state: window.__classicBattleState || null,
            prev: window.__classicBattlePrevState || null,
            event: window.__classicBattleLastEvent || null,
            log: Array.isArray(window.__classicBattleStateLog)
              ? window.__classicBattleStateLog.slice()
              : []
          };
        } catch {
          return { state: null, prev: null, event: null, log: [] };
        }
      };
    }
  } catch {}
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
      if (!IS_VITEST) console.error("Failed to emit debugPanelUpdate event:", innerError);
    }
  }
}

/**
 * Get the current battle state machine instance for tests and helpers.
 * @returns {import('./stateMachine.js').BattleStateMachine|null}
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function getBattleStateMachine() {
  return machine;
}
