import { emitBattleEvent } from "./battleEvents.js";
import { readDebugState } from "./debugHooks.js";

/**
 * Dispatch an event to the active battle machine.
 *
 * Safe wrapper around `machine.dispatch` that early-returns when no
 * machine is available and emits diagnostic events on failure.
 *
 * @pseudocode
 * 1. Get machine from debug state to avoid circular dependency.
 * 2. Return early when no `machine` exists.
 * 3. If `eventName` is `interrupt`, emit `interrupt.requested` with scope.
 * 4. Attempt to `await machine.dispatch(eventName, payload)`.
 * 5. On dispatch failure, emit a `debugPanelUpdate` event.
 *
 * @param {string} eventName - Event to send to the machine.
 * @param {any} [payload] - Optional event payload.
 * @returns {Promise<any>|void} Result of the dispatch when available.
 */
export async function dispatchBattleEvent(eventName, payload) {
  // Get machine from debug state to avoid circular dependency
  const getMachine =
    typeof globalThis !== "undefined" && globalThis.__classicBattleDebugRead
      ? globalThis.__classicBattleDebugRead("getClassicBattleMachine")
      : readDebugState("getClassicBattleMachine");
  const machine = typeof getMachine === "function" ? getMachine() : null;

  if (!machine) {
    // Not having a machine is an expected state during early startup
    // (for example when the round selection modal runs before the
    // orchestrator initializes). Use console.warn so tests that fail
    // on console.error don't treat this as a hard failure.
    console.warn("dispatchBattleEvent: no machine available for", eventName);
    return false;
  }

  // DEBUG: Log all event dispatches
  if (typeof console !== "undefined") {
    console.log(
      "[DEBUG] dispatchBattleEvent: dispatching",
      eventName,
      "to machine",
      machine.getState?.()
    );
  }

  try {
    // PRD taxonomy: emit interrupt.requested with payload context
    if (eventName === "interrupt") {
      try {
        const scope =
          payload?.scope || (machine?.getState?.() === "matchStart" ? "match" : "round");
        emitBattleEvent("interrupt.requested", { scope, reason: payload?.reason });
      } catch {
        // ignore: interrupt diagnostics are optional
      }
    }
    return await machine.dispatch(eventName, payload);
  } catch (error) {
    // ignore: dispatch failures only trigger debug updates
    try {
      console.error("Error dispatching battle event:", eventName, error);
      emitBattleEvent("debugPanelUpdate");
    } catch {
      // ignore: debug updates are best effort
    }
    return false;
  }
}
