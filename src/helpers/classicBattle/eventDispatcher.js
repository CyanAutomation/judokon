import { emitBattleEvent } from "./battleEvents.js";
import { readDebugState } from "./debugHooks.js";

const DEDUPE_WINDOW_MS = 20;
const recentDispatches = new Map();

function hasRecentDispatch(eventName) {
  if (typeof eventName !== "string" || !eventName) return false;
  const recorded = recentDispatches.get(eventName);
  if (typeof recorded !== "number") return false;
  return Date.now() - recorded < DEDUPE_WINDOW_MS;
}

function rememberDispatch(eventName) {
  if (typeof eventName !== "string" || !eventName) return null;
  const timestamp = Date.now();
  recentDispatches.set(eventName, timestamp);
  setTimeout(() => {
    const current = recentDispatches.get(eventName);
    if (current === timestamp) {
      recentDispatches.delete(eventName);
    }
  }, DEDUPE_WINDOW_MS);
  return timestamp;
}

function clearDispatchRecord(eventName, timestamp) {
  if (typeof eventName !== "string" || typeof timestamp !== "number") return;
  const current = recentDispatches.get(eventName);
  if (current === timestamp) {
    recentDispatches.delete(eventName);
  }
}

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
  let machineSource =
    typeof globalThis !== "undefined" && typeof globalThis.__classicBattleDebugRead === "function"
      ? globalThis.__classicBattleDebugRead("getClassicBattleMachine")
      : undefined;

  if (typeof machineSource !== "function") {
    const fallback = readDebugState("getClassicBattleMachine");
    if (typeof fallback === "function") {
      machineSource = fallback;
    } else if (!machineSource && fallback) {
      machineSource = fallback;
    }
  }

  const machine = typeof machineSource === "function" ? machineSource() : machineSource || null;
  console.error("[TEST DEBUG] eventDispatcher: Retrieved machine", machine);

  if (!machine) {
    // Not having a machine is an expected state during early startup
    // (for example when the round selection modal runs before the
    // orchestrator initializes). Return `false` to signal the skipped
    // dispatch without emitting console noise in production.
    console.error("[TEST DEBUG] dispatchBattleEvent: No machine available for event", eventName);
    return false;
  }

  if (hasRecentDispatch(eventName)) {
    return true;
  }

  const dispatchTimestamp = rememberDispatch(eventName);

  // DEBUG: Log all event dispatches
  if (typeof console !== "undefined") {
    console.error(
      "[TEST DEBUG] dispatchBattleEvent: dispatching",
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
    const result = await machine.dispatch(eventName, payload);
    if (result === false) {
      clearDispatchRecord(eventName, dispatchTimestamp);
    }
    return result;
  } catch (error) {
    clearDispatchRecord(eventName, dispatchTimestamp);
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
