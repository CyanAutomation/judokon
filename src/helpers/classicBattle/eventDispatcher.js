import { emitBattleEvent } from "./battleEvents.js";
import { readDebugState, exposeDebugState } from "./debugHooks.js";

const DEDUPE_WINDOW_MS = 20;
const recentDispatches = new Map();
const machineIds = new WeakMap();
let machineIdCounter = 0;

/**
 * Get a high-resolution timestamp for deduplication tracking.
 *
 * @pseudocode
 * 1. Try to use Node.js high-resolution time (process.hrtime.bigint) if available.
 * 2. Convert nanoseconds to milliseconds for consistency.
 * 3. Fall back to Date.now() if high-resolution time is not available.
 * 4. Return the timestamp as a number for deduplication comparisons.
 *
 * @returns {number} Current timestamp in milliseconds
 */
function getTimestamp() {
  try {
    if (
      typeof process !== "undefined" &&
      typeof process.hrtime === "function" &&
      typeof process.hrtime.bigint === "function"
    ) {
      const ns = process.hrtime.bigint();
      return Number(ns / 1000000n);
    }
  } catch {}
  return Date.now();
}

/**
 * Get a unique identifier for a machine instance.
 *
 * @pseudocode
 * 1. Check if machine is a valid object or function.
 * 2. If machine is not in the WeakMap, assign it a new incremental ID.
 * 3. Return the cached ID for the machine.
 * 4. Return "global" as fallback for invalid machines.
 * 5. This ensures consistent identification across deduplication operations.
 *
 * @param {any} machine - The machine instance to identify
 * @returns {string|number} Unique identifier for the machine
 */
function getMachineId(machine) {
  if (machine && (typeof machine === "object" || typeof machine === "function")) {
    if (!machineIds.has(machine)) {
      machineIds.set(machine, ++machineIdCounter);
    }
    return machineIds.get(machine);
  }
  return "global";
}

/**
 * Generate a unique key for event deduplication tracking.
 *
 * @pseudocode
 * 1. Validate that eventName is a non-empty string.
 * 2. Return null if eventName is invalid.
 * 3. Combine eventName with machine ID using colon separator.
 * 4. Return the composite key for deduplication tracking.
 * 5. This creates unique keys per event type and machine instance.
 *
 * @param {string} eventName - The event name to track
 * @param {any} machine - The machine instance for context
 * @returns {string|null} Composite key for deduplication or null if invalid
 */
function getDispatchKey(eventName, machine) {
  if (typeof eventName !== "string" || !eventName) return null;
  return `${eventName}:${getMachineId(machine)}`;
}

/**
 * Register an event dispatch and check for deduplication.
 *
 * @pseudocode
 * 1. Skip deduplication for all events except "ready".
 * 2. Generate a dispatch key for the event and machine.
 * 3. Check if this event was dispatched recently within the deduplication window.
 * 4. If within window, return shouldSkip=true to prevent duplicate dispatch.
 * 5. If not within window, track the current dispatch and schedule cleanup.
 * 6. Return dispatch metadata for tracking and potential reset.
 *
 * @param {string} eventName - The event name being dispatched
 * @param {any} machine - The machine instance dispatching the event
 * @returns {object} Dispatch registration result with shouldSkip, key, and timestamp
 */
function registerDispatch(eventName, machine) {
  if (eventName !== "ready") {
    return { shouldSkip: false, key: null, timestamp: 0 };
  }
  const key = getDispatchKey(eventName, machine);
  if (!key) {
    return { shouldSkip: false, key: null, timestamp: 0 };
  }
  const now = getTimestamp();
  const last = recentDispatches.get(key);
  if (typeof last === "number" && now - last < DEDUPE_WINDOW_MS) {
    try {
      exposeDebugState("dispatchReadySkipped", now - last);
    } catch {}
    process.stdout.write(`[dedupe] skip ${eventName} ${now - last} ${key}
`);
    return { shouldSkip: true, key, timestamp: last };
  }
  try {
    exposeDebugState("dispatchReadyTracked", now);
  } catch {}
  process.stdout.write(`[dedupe] track ${eventName} ${now} ${key}
`);
  recentDispatches.set(key, now);
  if (typeof setTimeout === "function") {
    setTimeout(() => {
      if (recentDispatches.get(key) === now) {
        recentDispatches.delete(key);
      }
    }, DEDUPE_WINDOW_MS);
  }
  return { shouldSkip: false, key, timestamp: now };
}

/**
 * Reset the dispatch history for deduplication tracking.
 *
 * @pseudocode
 * 1. If no specific event name is provided, clear all dispatch history.
 * 2. If an event name is provided, iterate through all tracked dispatches.
 * 3. Remove any dispatch records that match the specified event name pattern.
 * 4. This allows the next dispatch of the same event to proceed without deduplication.
 *
 * @param {string} [eventName] - Optional event name to reset, clears all if not specified
 */
export function resetDispatchHistory(eventName) {
  process.stdout.write(`[dedupe] reset ${eventName}
`);
  if (!eventName) {
    recentDispatches.clear();
    return;
  }
  for (const key of Array.from(recentDispatches.keys())) {
    if (key.startsWith(`${eventName}:`)) {
      recentDispatches.delete(key);
    }
  }
}

/**
 * Reset a specific dispatch key if it matches the given timestamp.
 *
 * @pseudocode
 * 1. Return early if no key is provided.
 * 2. Get the current timestamp for the key from recentDispatches.
 * 3. If the current timestamp matches the provided timestamp, delete the key.
 * 4. This allows precise control over deduplication reset for specific dispatches.
 *
 * @param {string} key - The dispatch key to potentially reset
 * @param {number} timestamp - The timestamp to match for reset
 */
function resetDispatchKey(key, timestamp) {
  if (!key) return;
  const current = recentDispatches.get(key);
  if (current === timestamp) {
    recentDispatches.delete(key);
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

  // Expose raw getter diagnostics so tests can assert visibility across ESM/module boundaries
  try {
    const globalGetter =
      typeof globalThis !== "undefined" && typeof globalThis.__classicBattleDebugRead === "function"
        ? globalThis.__classicBattleDebugRead("getClassicBattleMachine")
        : undefined;
    try {
      exposeDebugState("dispatch_globalGetterType", typeof globalGetter);
    } catch {}
  } catch {}
  try {
    exposeDebugState("dispatch_machineSourceType", typeof machineSource);
  } catch {}
  try {
    if (typeof machineSource === "function") {
      let invoked = null;
      try {
        invoked = machineSource();
      } catch {}
      try {
        exposeDebugState("dispatch_machineSourceInvokedType", typeof invoked);
      } catch {}
    } else {
      try {
        exposeDebugState("dispatch_machineSourceInvokedType", typeof machineSource);
      } catch {}
    }
  } catch {}

  const machine = typeof machineSource === "function" ? machineSource() : machineSource || null;
  try {
    exposeDebugState("dispatchMachineAvailable", !!machine);
  } catch {}

  if (!machine) {
    // Not having a machine is an expected state during early startup
    // (for example when the round selection modal runs before the
    // orchestrator initializes). Return `false` to signal the skipped
    // dispatch without emitting console noise in production.
    try {
      exposeDebugState("dispatchBattleEventNoMachine", eventName);
    } catch {}
    return false;
  }

  const { shouldSkip, key: dispatchKey, timestamp } = registerDispatch(eventName, machine);
  if (shouldSkip) {
    try {
      exposeDebugState("dispatchBattleEventSkipped", { event: eventName, key: dispatchKey });
    } catch {}
    process.stdout.write(`[dedupe] short-circuit ${eventName} ${dispatchKey}
`);
    return true;
  }

  // DEBUG: Log all event dispatches
  try {
    exposeDebugState(
      "dispatchMachineStateBefore",
      typeof machine.getState === "function" ? machine.getState() : (machine.state ?? null)
    );
  } catch {}

  try {
    exposeDebugState("dispatchBattleEventInvoked", eventName);
  } catch {}

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
    try {
      exposeDebugState("dispatchBattleEventResult", result);
    } catch {}
    try {
      exposeDebugState(
        "dispatchMachineStateAfter",
        typeof machine.getState === "function" ? machine.getState() : (machine.state ?? null)
      );
    } catch {}
    if (result === false) {
      resetDispatchKey(dispatchKey, timestamp);
    }
    return result;
  } catch (error) {
    resetDispatchKey(dispatchKey, timestamp);
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
