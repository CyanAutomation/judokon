/**
 * Handlers responding to `battleStateChange` events.
 *
 * @module stateTransitionListeners
 */
import { emitBattleEvent } from "./battleEvents.js";
import { logStateTransition, resolveStateWaiters } from "./battleDebug.js";

/**
 * Mirror the current battle state to the DOM and dispatch the legacy
 * `battle:state` event.
 *
 * @param {CustomEvent<{from:string|null,to:string,event:string|null}>} e
 *   State transition detail.
 * @summary Sync battle state to DOM.
 * @pseudocode
 * 1. Extract `from`, `to`, and `event` from `e.detail`.
 * 2. If `document` is available:
 *    a. Update `document.body.dataset.battleState` to `to`.
 *    b. Set `prevBattleState` when `from` exists, otherwise remove it.
 *    c. Dispatch a `battle:state` event with the same detail.
 */
export function domStateListener(e) {
  const { from, to, event } = e.detail || {};
  if (typeof document === "undefined") return;
  try {
    const ds = document.body?.dataset;
    if (ds) {
      ds.battleState = to;
      if (from) ds.prevBattleState = from;
      else delete ds.prevBattleState;
    }
    document.dispatchEvent(new CustomEvent("battle:state", { detail: { from, to, event } }));
  } catch {}
}

/**
 * Create a listener that logs state transitions on `window` and updates
 * timer diagnostics.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager|null} machine
 *   Active battle machine.
 * @returns {(e: CustomEvent<{from:string|null,to:string,event:string|null}>) => void}
 *   Registered listener.
 * @summary Create debug listener for state transitions.
 * @pseudocode
 * 1. Return a function handling the `battleStateChange` event.
 * 2. Inside the handler:
 *    a. Record the transition via `logStateTransition`.
 *    b. Read timer state from the machine and mirror it on
 *       `window.__classicBattleTimerState`.
 *    c. Emit `debugPanelUpdate` for UI consumers.
 */
export function createDebugLogListener(machine) {
  return function debugLogListener(e) {
    const { from, to, event } = e.detail || {};
    logStateTransition(from, to, event);
    try {
      if (machine) {
        const timerState = machine.context?.engine?.getTimerState?.();
        if (timerState && typeof window !== "undefined") {
          window.__classicBattleTimerState = timerState;
        }
      }
    } catch {}
    emitBattleEvent("debugPanelUpdate");
  };
}

/**
 * Create a listener that resolves state transition waiters.
 *
 * @param {Map<string, {resolve:Function,timer?:ReturnType<typeof setTimeout>,__id?:string}[]>} stateWaiters
 *   Waiters keyed by target state.
 * @returns {(e: CustomEvent<{to:string}>) => void}
 *   Registered listener.
 * @summary Resolve promises waiting on a state.
 * @pseudocode
 * 1. Read the `to` state from `e.detail`.
 * 2. Resolve any waiters tracked via `resolveStateWaiters`.
 */
export function createWaiterResolver() {
  return function waiterResolver(e) {
    const { to } = e.detail || {};
    resolveStateWaiters(to);
  };
}
