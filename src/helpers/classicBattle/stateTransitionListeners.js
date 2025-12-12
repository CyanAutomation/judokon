/**
 * Handlers responding to `battleStateChange` events.
 *
 * @module stateTransitionListeners
 */
import { emitBattleEvent } from "./battleEvents.js";
import { logStateTransition } from "./battleDebug.js";
import { exposeDebugState } from "./debugHooks.js";
import { onBattleEvent, offBattleEvent } from "./battleEvents.js";

/**
 * Create a listener that syncs battle state transitions to DOM attributes for UI and tests.
 *
 * @returns {(e: CustomEvent<{from:string|null,to:string,event:string|null}>) => void}
 *   Listener function that updates document.body.dataset attributes
 * @pseudocode
 * 1. Return a function handling the `battleStateChange` event.
 * 2. Inside the handler:
 *    a. Read `from` and `to` from the event detail.
 *    b. If `document` exists, update `document.body.dataset.battleState` and `prevBattleState`.
 */
export function createDomStateListener() {
  return function domStateListener(e) {
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
  };
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

/**
 * Register all state transition listeners with the event bus.
 * Consolidated utility for registering both DOM and debug listeners.
 *
 * @param {import("./stateManager.js").ClassicBattleStateManager|null} machine
 *   Active battle machine (passed to debug listener)
 * @returns {() => void}
 *   Cleanup function that unregisters both listeners
 * @pseudocode
 * 1. Create both listener instances (DOM and debug)
 * 2. Register both with the battleStateChange event
 * 3. Return a cleanup function that unregisters both
 */
export function registerStateTransitionListeners(machine) {
  const domListener = createDomStateListener();
  const debugListener = createDebugLogListener(machine);

  onBattleEvent("battleStateChange", domListener);
  onBattleEvent("battleStateChange", debugListener);

  // Return cleanup function
  return () => {
    offBattleEvent("battleStateChange", domListener);
    offBattleEvent("battleStateChange", debugListener);
  };
}
