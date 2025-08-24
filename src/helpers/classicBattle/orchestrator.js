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
      if (machine?.getState() === targetState) return resolve(true);
      const entry = { resolve };
      if (timeoutMs !== Infinity) {
        entry.timer = setTimeout(() => {
          removeWaiter(targetState, entry);
          reject(new Error("onStateTransition timeout"));
        }, timeoutMs);
      }
      const arr = stateWaiters.get(targetState) || [];
      arr.push(entry);
      stateWaiters.set(targetState, arr);
    } catch {
      reject(new Error("onStateTransition error"));
    }
  });
}

/**
 * Removes a specific waiter entry from the `stateWaiters` Map for a given state.
 * This function is used internally to clean up waiters, especially after a Promise resolves or times out.
 *
 * @pseudocode
 * 1. Retrieve the array of waiters (`arr`) associated with `stateName` from `stateWaiters`.
 * 2. If no array is found (`!arr`), exit the function as there are no waiters for this state.
 * 3. Find the index of the `entry` within the `arr`.
 * 4. If the `entry` is found (`idx !== -1`), remove it from the `arr` using `splice`.
 * 5. After removal, if the `arr` becomes empty (`arr.length === 0`), delete the `stateName` key from `stateWaiters` to clean up empty entries.
 *
 * @param {string} stateName - The name of the state whose waiter is to be removed.
 * @param {object} entry - The specific waiter entry object to remove.
 * @returns {void}
 */
function removeWaiter(stateName, entry) {
  const arr = stateWaiters.get(stateName);
  if (!arr) return;
  const idx = arr.indexOf(entry);
  if (idx !== -1) arr.splice(idx, 1);
  if (arr.length === 0) stateWaiters.delete(stateName);
}

/**
 * Retrieve the current battle state machine instance.
 *
 * @returns {import('./stateMachine.js').BattleStateMachine|null} Current instance.
 */
export function getBattleStateMachine() {
  return machine;
}

/**
 * Initialize the classic battle orchestrator. This function sets up the battle state machine,
 * defines its transition behavior, and exposes debugging utilities.
 *
 * @pseudocode
 * 1. Destructure `resetGame` and `startRound` from `opts`, falling back to local implementations if not provided.
 * 2. Create a `context` object containing the `store`, resolved `doResetGame`, `doStartRound`, and `startRoundWrapper`.
 * 3. Define the `onEnter` object, mapping state names to their respective handler functions (e.g., `waitingForMatchStart` to `waitingForMatchStartEnter`).
 * 4. Define the `onTransition` asynchronous function, which executes every time the state machine transitions:
 *    a. If running in a browser environment (`typeof window !== "undefined"`):
 *       i. Update global `window` variables (`__classicBattleState`, `__classicBattlePrevState`, `__classicBattleLastEvent`) for debugging.
 *       ii. Create a log entry with `from`, `to`, `event`, and timestamp.
 *       iii. Maintain a circular log buffer (`__classicBattleStateLog`) of the last 20 state transitions.
 *       iv. Update a hidden DOM element (`#machine-state`) with the current state and transition details for visual debugging.
 *       v. Update a visible badge (`#battle-state-badge`) with the current state.
 *       vi. If a battle engine exists in the machine's context, update global `window` variables (`__classicBattleTimerState`) and a hidden DOM element (`#machine-timer`) with timer state details.
 *    b. Emit a "debugPanelUpdate" battle event.
 *    c. Retrieve any pending `waiters` for the new `to` state from `stateWaiters`.
 *    d. If `waiters` exist, delete the entry for `to` from `stateWaiters`.
 *    e. Iterate through each `waiter` in the retrieved list:
 *       i. Clear any associated timeout timer (`w.timer`).
 *       ii. Resolve the waiter's Promise (`w.resolve(true)`).
 * 5. Create the `BattleStateMachine` instance using `BattleStateMachine.create`, passing `onEnter`, `context`, and `onTransition`.
 * 6. Set the created `machine` instance using `setMachine`.
 * 7. If running in a browser environment, expose `window.__getClassicBattleMachine` as a safe getter for the machine instance to avoid import cycles.
 * 8. If running in a document environment, add a "visibilitychange" event listener to the `document`:
 *    a. If the document becomes hidden, call `handleTabInactive` on the battle engine.
 *    b. If the document becomes visible, call `handleTabActive` on the battle engine.
 * 9. If a battle engine exists, set its `onTimerDrift` callback to emit a "scoreboardShowMessage" event with the drift amount, emit a "debugPanelUpdate" event, and call `handleTimerDrift` on the engine.
 * 10. If running in a browser environment and a battle engine exists, expose `window.injectClassicBattleError` for debugging:
 *     a. This function injects an error into the engine, emits a scoreboard message, updates the debug panel, and dispatches an "interruptMatch" event.
 * 11. If running in a browser environment, expose `window.onStateTransition` (the current function) and `window.getBattleStateSnapshot` for external debugging and state inspection.
 * 12. Return the initialized `machine` instance.
 *
 * @param {object} store - Shared battle store.
 * @param {Function} startRoundWrapper - Optional wrapper for starting a round.
 * @param {object} [opts] - Optional overrides.
 * @param {Function} [opts.resetGame] - Custom reset handler.
 * @param {Function} [opts.startRound] - Custom round start handler.
 * @returns {Promise<void>} Resolves when setup completes.
 */
export async function initClassicBattleOrchestrator(store, startRoundWrapper, opts = {}) {
  const { resetGame: resetGameOpt, startRound: startRoundOpt } = opts;
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
    try {
      if (typeof window !== "undefined") {
        window.__classicBattleState = to;
        if (from) window.__classicBattlePrevState = from;
        if (event) window.__classicBattleLastEvent = event;
        const entry = { from: from || null, to, event: event || null, ts: Date.now() };
        const log = Array.isArray(window.__classicBattleStateLog)
          ? window.__classicBattleStateLog
          : [];
        log.push(entry);
        while (log.length > 20) log.shift();
        window.__classicBattleStateLog = log;
        let el = document.getElementById("machine-state");
        if (!el) {
          el = document.createElement("div");
          el.id = "machine-state";
          el.style.display = "none";
          document.body.appendChild(el);
        }
        el.textContent = to;
        if (from) el.dataset.prev = from;
        if (event) el.dataset.event = event;
        el.dataset.ts = String(entry.ts);
        try {
          const badge = document.getElementById("battle-state-badge");
          if (badge) badge.textContent = `State: ${to}`;
        } catch {}
        if (typeof window !== "undefined" && machine?.context?.engine) {
          const timerState = machine.context.engine.getTimerState();
          window.__classicBattleTimerState = timerState;
          let timerEl = document.getElementById("machine-timer");
          if (!timerEl) {
            timerEl = document.createElement("div");
            timerEl.id = "machine-timer";
            timerEl.style.display = "none";
            document.body.appendChild(timerEl);
          }
          timerEl.textContent = JSON.stringify(timerState);
          timerEl.dataset.remaining = timerState.remaining;
          timerEl.dataset.paused = timerState.paused;
        }
      }
    } catch {}
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
  };

  machine = await BattleStateMachine.create(onEnter, context, onTransition);
  setMachine(machine);

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
    } catch {}
  }
}
