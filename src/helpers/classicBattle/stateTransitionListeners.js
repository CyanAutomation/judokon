/**
 * Handlers responding to `battleStateChange` events.
 *
 * @module stateTransitionListeners
 */
import { emitBattleEvent } from "./battleEvents.js";
import { logStateTransition } from "./battleDebug.js";
import { exposeDebugState } from "./debugHooks.js";

/**
 * Mirror the current battle state to the DOM.
 *
 * @param {CustomEvent<{from:string|null,to:string,event:string|null}>} e
 *   State transition detail.
 * @summary Sync battle state to DOM.
 * @pseudocode
 * 1. Extract `from`, `to`, and `event` from `e.detail`.
 * 2. If `document` is available:
 *    a. Update `document.body.dataset.battleState` to `to`.
 *    b. Set `prevBattleState` when `from` exists, otherwise remove it.
 */
export function domStateListener(e) {
  const { from, to } = e.detail || {};
  if (typeof document === "undefined") return;
  try {
    const ds = document.body?.dataset;
    if (ds) {
      ds.battleState = to;
      if (from) ds.prevBattleState = from;
      else delete ds.prevBattleState;
    }
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
 *    b. Read timer state from the machine and expose it via `exposeDebugState`.
 *    c. Emit `debugPanelUpdate` for UI consumers.
 */
export function createDebugLogListener(machine) {
  return function debugLogListener(e) {
    const { from, to, event } = e.detail || {};
    logStateTransition(from, to, event);
    try {
      if (machine) {
        const timerState = machine.context?.engine?.getTimerState?.();
        if (timerState) exposeDebugState("classicBattleTimerState", timerState);
      }
    } catch {}
    emitBattleEvent("debugPanelUpdate");
  };
}
