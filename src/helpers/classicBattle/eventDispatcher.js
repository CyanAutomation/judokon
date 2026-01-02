import { emitBattleEvent } from "./battleEvents.js";
import { readDebugState, exposeDebugState } from "./debugHooks.js";
import { debugLog } from "../debug.js";

const DEDUPE_WINDOW_MS = 20;
const recentDispatches = new Map();
const machineIds = new WeakMap();
let machineIdCounter = 0;

/**
 * Write deduplication diagnostics when stdout is available.
 *
 * @internal
 *
 * @pseudocode
 * 1. Confirm a Node-like `process.stdout.write` function exists.
 * 2. Attempt to write the provided message to stdout.
 * 3. Silently ignore any write failures to keep diagnostics best-effort.
 *
 * @param {string} message - The diagnostic message to emit.
 */
function writeDedupeLog(message) {
  if (
    typeof process !== "undefined" &&
    process &&
    process.stdout &&
    typeof process.stdout.write === "function"
  ) {
    try {
      debugLog(message);
    } catch {
      // Silently ignore write failures to keep diagnostics best-effort
    }
  }
}

/**
 * Get a high-resolution timestamp for deduplication tracking.
 *
 * @internal
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
 * @internal
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
 * @internal
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
 * Safely expose debug state, swallowing any errors.
 *
 * @internal
 *
 * @param {string} key - Debug state key
 * @param {any} value - Debug state value
 */
function safeExposeDebugState(key, value) {
  try {
    exposeDebugState(key, value);
  } catch {
    // Debug state exposure is best-effort, ignore failures
  }
}

/**
 * Register an event dispatch and check for deduplication.
 *
 * @internal
 *
 * Deduplication only applies to "ready" events to prevent rapid re-initialization
 * of the battle machine during startup transients. Other events are dispatched normally.
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
    safeExposeDebugState("dispatchReadySkipped", now - last);
    writeDedupeLog(`[dedupe] skip ${eventName} ${now - last} ${key}
`);
    return { shouldSkip: true, key, timestamp: last };
  }
  safeExposeDebugState("dispatchReadyTracked", now);
  writeDedupeLog(`[dedupe] track ${eventName} ${now} ${key}
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
 * @returns {void}
 */
export function resetDispatchHistory(eventName) {
  writeDedupeLog(`[dedupe] reset ${eventName}
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
 * @internal
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
 * Get machine state safely, handling both function and property access.
 *
 * @internal
 *
 * @param {any} machine - Machine instance
 * @returns {any} Machine state or null if unavailable
 */
function getMachineState(machine) {
  try {
    if (typeof machine?.getState === "function") {
      return machine.getState();
    }
    return machine?.state ?? null;
  } catch {
    return null;
  }
}

/**
 * Dispatch an event to the active battle machine.
 *
 * Safe wrapper around `machine.dispatch` that early-returns when no
 * machine is available and emits diagnostic events on failure.
 *
 * Return value semantics:
 * - `false`: Machine not available (early startup state)
 * - `true`: Dispatch was deduped/skipped
 * - Other: Result from machine.dispatch()
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
 * @returns {Promise<any>|boolean} Result of dispatch, true if skipped, false if unavailable.
 */
export async function dispatchBattleEvent(eventName, payload) {
  const machine = getMachineFromDebugState();

  safeExposeDebugState("dispatchMachineAvailable", !!machine);

  if (!machine) {
    // Not having a machine is an expected state during early startup
    // (for example when the round selection modal runs before the
    // orchestrator initializes). Return `false` to signal the skipped
    // dispatch without emitting console noise in production.
    debugLog("[dispatchBattleEvent] No machine available for event:", eventName);
    safeExposeDebugState("dispatchBattleEventNoMachine", eventName);
    return false;
  }

  debugLog("[dispatchBattleEvent] Machine available, dispatching:", eventName);
  const { shouldSkip, key: dispatchKey, timestamp } = registerDispatch(eventName, machine);
  if (shouldSkip) {
    debugLog("[dispatchBattleEvent] Dispatch skipped (dedupe):", eventName);
    safeExposeDebugState("dispatchBattleEventSkipped", { event: eventName, key: dispatchKey });
    writeDedupeLog(`[dedupe] short-circuit ${eventName} ${dispatchKey}
`);
    return true;
  }

  safeExposeDebugState("dispatchMachineStateBefore", getMachineState(machine));
  safeExposeDebugState("dispatchBattleEventInvoked", eventName);

  try {
    // PRD taxonomy: emit interrupt.requested with payload context
    if (eventName === "interrupt") {
      try {
        const scope =
          payload?.scope || (getMachineState(machine) === "matchStart" ? "match" : "round");
        emitBattleEvent("interrupt.requested", { scope, reason: payload?.reason });
      } catch {
        // ignore: interrupt diagnostics are optional
      }
    }

    debugLog("[dispatchBattleEvent] Calling machine.dispatch for:", eventName);
    const result = await machine.dispatch(eventName, payload);
    debugLog("[dispatchBattleEvent] machine.dispatch returned:", result);
    safeExposeDebugState("dispatchBattleEventResult", result);
    safeExposeDebugState("dispatchMachineStateAfter", getMachineState(machine));

    if (result === false) {
      resetDispatchKey(dispatchKey, timestamp);
    }
    return result;
  } catch (error) {
    resetDispatchKey(dispatchKey, timestamp);
    // ignore: dispatch failures only trigger debug updates
    try {
      debugLog("Error dispatching battle event:", eventName, error);
      emitBattleEvent("debugPanelUpdate");
    } catch {
      // ignore: debug updates are best effort
    }
    return false;
  }
}

/**
 * Get the battle machine from debug state, with fallback chain.
 *
 * @internal
 *
 * Attempts to retrieve machine via:
 * 1. globalThis.__classicBattleDebugRead (ESM module boundary)
 * 2. readDebugState fallback (same module context)
 * 3. Direct property access as last resort
 *
 * @returns {any|null} Machine instance or null if unavailable
 */
function getMachineFromDebugState() {
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

  safeExposeDebugState(
    "dispatch_globalGetterType",
    typeof globalThis?.__classicBattleDebugRead?.("getClassicBattleMachine")
  );
  safeExposeDebugState("dispatch_machineSourceType", typeof machineSource);

  const machineSourceType = typeof machineSource;
  let machine = null;

  if (machineSourceType === "function") {
    machine = machineSource();
  } else if (machineSource) {
    machine = machineSource;
  }

  safeExposeDebugState(
    "dispatch_machineSourceInvokedType",
    machineSourceType === "function" ? typeof machine : machineSourceType
  );

  return machine;
}
