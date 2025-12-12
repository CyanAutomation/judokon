/**
 * Handlers responding to `battleStateChange` events.
 *
 * @module stateTransitionListeners
 */
import { emitBattleEvent } from "./battleEvents.js";
import { logStateTransition } from "./battleDebug.js";
import { exposeDebugState } from "./debugHooks.js";
import { onBattleEvent, offBattleEvent } from "./battleEvents.js";

// Debug state key constant
const DEBUG_STATE_KEY = "classicBattleTimerState";

/**
 * Create a listener that syncs battle state transitions to DOM attributes for UI and tests.
 *
 * @returns {(e: CustomEvent<{from:string|null,to:string,event:string|null}>) => void}
 *   Listener function that updates document.body.dataset attributes
 * @pseudocode
 * 1. Return a function handling the `battleStateChange` event.
 * 2. Inside the handler:
 *    a. Validate `to` state exists and is a valid string
 *    b. Read `from` and `to` from the event detail.
 *    c. If `document` exists, update `document.body.dataset.battleState` and `prevBattleState`.
 */
export function createDomStateListener() {
  return function domStateListener(e) {
    const { from, to } = e.detail || {};

    // Validate required state
    if (!to || typeof to !== "string") {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("stateTransitionListeners: Missing or invalid 'to' state in event detail", {
          received: to,
          detail: e.detail
        });
      }
      return;
    }

    if (typeof document === "undefined") return;
    try {
      const ds = document.body?.dataset;
      if (ds) {
        ds.battleState = to;
        if (from) ds.prevBattleState = from;
        else delete ds.prevBattleState;
      }
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("stateTransitionListeners: Failed to sync DOM state", { error });
      }
    }
  };
}

/**
 * Backward compatibility: Direct listener reference (singleton instance).
 * Prefer createDomStateListener() for new code.
 * @deprecated Use createDomStateListener() instead for new code
 */
export const domStateListener = createDomStateListener();

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
 *    a. Validate `to` state exists
 *    b. Record the transition via `logStateTransition`.
 *    c. Read timer state from the machine and expose it via `exposeDebugState`.
 *    d. Emit `debugPanelUpdate` for UI consumers.
 */
export function createDebugLogListener(machine) {
  return function debugLogListener(e) {
    const { from, to, event } = e.detail || {};

    // Validate required state
    if (!to || typeof to !== "string") {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("stateTransitionListeners: Debug listener received invalid 'to' state", {
          received: to
        });
      }
      return;
    }

    logStateTransition(from, to, event);
    try {
      if (machine) {
        const timerState = machine.context?.engine?.getTimerState?.();
        if (timerState) exposeDebugState(DEBUG_STATE_KEY, timerState);
      }
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("stateTransitionListeners: Failed to expose timer state", { error });
      }
    }
    try {
      emitBattleEvent("debugPanelUpdate");
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("stateTransitionListeners: Failed to emit debugPanelUpdate", { error });
      }
    }
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
