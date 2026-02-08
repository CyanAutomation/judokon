import { isConsoleMocked, shouldShowTestLogs } from "../testLogGate.js";
/**
 * Lightweight event bus for Classic Battle interactions.
 *
 * @pseudocode
 * 1. Retrieve a shared `EventTarget` from `globalThis` using a fixed key.
 * 2. Create it if missing.
 * 3. Provide helpers to subscribe, unsubscribe, emit, and reset events.
 */
import { logEventEmit, createComponentLogger } from "./debugLogger.js";
import { setMaxListenersIfNode } from "../nodeEventsShim.js";
import { emitBattleEventWithAliases as emitBattleEventWithAliasesCore } from "./eventAliases.js";

const eventLogger = createComponentLogger("BattleEvents");
const EVENT_TARGET_KEY = "__classicBattleEventTarget";
const DISPATCH_PATCHED_KEY = "__classicBattleDispatchPatched";
const DISPATCH_ORIGINAL_KEY = "__classicBattleDispatchOriginal";
const DISPATCH_WRAPPED_KEY = "__classicBattleDispatchWrapped";
const lastSeenEventKeys = new Map();
const VALUE_ONLY_EVENT_TYPES = new Set([
  "round.timer.tick",
  "round.evaluated",
  "display.score.update",
  "match.score.update",
  "match.score.updated"
]);

/**
 * Clear semantic dedupe state for value-only battle events.
 *
 * @summary Reset value-event dedupe memory between matches.
 * @pseudocode
 * 1. Clear the module-level `lastSeenEventKeys` map.
 * 2. Return immediately when no entries exist.
 *
 * @returns {void}
 */
export function resetBattleEventDedupeState() {
  lastSeenEventKeys.clear();
  lastSeenEventKeys.clear();
}

/**
 * Check if running in Vitest environment.
 *
 * @pseudocode
 * 1. Safely check for process.env.VITEST variable.
 * 2. Return false if not in Node.js or variable unavailable.
 *
 * @returns {boolean} True if running under Vitest.
 */
function isVitest() {
  try {
    return typeof process !== "undefined" && !!process.env?.VITEST;
  } catch {
    return false;
  }
}

/**
 * Instrument event dispatcher for test debugging (Vitest only).
 *
 * @pseudocode
 * 1. Only patch globalThis.dispatchEvent if running under Vitest.
 * 2. Log events when test logs are enabled or console is mocked.
 * 3. Preserve original dispatcher behavior.
 *
 * @returns {void}
 */
function setupTestDebugInstrumentation() {
  if (!isVitest()) return;

  if (typeof globalThis.dispatchEvent !== "function") {
    return;
  }

  if (
    globalThis[DISPATCH_PATCHED_KEY] &&
    globalThis.dispatchEvent === globalThis[DISPATCH_WRAPPED_KEY]
  ) {
    return;
  }

  const originalDispatchEvent =
    typeof globalThis[DISPATCH_ORIGINAL_KEY] === "function"
      ? globalThis[DISPATCH_ORIGINAL_KEY]
      : globalThis.dispatchEvent;

  if (globalThis.dispatchEvent === globalThis[DISPATCH_WRAPPED_KEY]) {
    globalThis[DISPATCH_PATCHED_KEY] = true;
    return;
  }

  const wrappedDispatchEvent = function (event) {
    if (
      typeof console !== "undefined" &&
      event &&
      event.type &&
      (shouldShowTestLogs() || isConsoleMocked(console.log))
    ) {
      console.log("[TEST DEBUG] dispatchEvent:", event.type, event.detail);
    }
    return originalDispatchEvent.apply(this, arguments);
  };

  globalThis[DISPATCH_ORIGINAL_KEY] = originalDispatchEvent;
  globalThis[DISPATCH_WRAPPED_KEY] = wrappedDispatchEvent;
  globalThis.dispatchEvent = wrappedDispatchEvent;
  globalThis[DISPATCH_PATCHED_KEY] = true;
}

// Initialize test instrumentation if in test environment
setupTestDebugInstrumentation();

function __tuneMaxListenersIfNode(target) {
  if (!target) return;

  if (!isVitest()) return;

  try {
    queueMicrotask(() => {
      setMaxListenersIfNode(target);
    });
  } catch {}
}

/**
 * Return the shared event target, creating it if needed.
 *
 * @returns {EventTarget}
 * @summary Get or create the classic battle event target.
 * @pseudocode
 * 1. Check if the global event target exists on `globalThis`.
 * 2. If it doesn't exist, create a new `EventTarget`, store it on `globalThis`, and adjust Node.js listener limits if applicable.
 * 3. Stamp the target with a stable debug ID for identity tracking.
 * 4. Return the existing or newly created event target.
 */
function getTarget() {
  if (!globalThis[EVENT_TARGET_KEY]) {
    const t = new EventTarget();
    globalThis[EVENT_TARGET_KEY] = t;
    __tuneMaxListenersIfNode(t);

    // DIAGNOSTIC: Stamp EventTarget with stable ID for identity tracking
    t.__debugId = `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    t.__createdAt = new Date().toISOString();

    if (isVitest() || typeof window !== "undefined") {
      console.log(`[EventTarget] Created new target: ${t.__debugId} at ${t.__createdAt}`);
    }
  }
  return globalThis[EVENT_TARGET_KEY];
}

/**
 * Produce a stable semantic key for value-only event deduplication.
 *
 * @internal
 *
 * @pseudocode
 * 1. Read semantic identity from known payload fields (round/version/hash/remaining/scores).
 * 2. Normalize each key segment to a string, replacing missing values with a sentinel.
 * 3. Join the normalized segments into a deterministic composite key.
 *
 * @param {any} detail - Event payload to normalize.
 * @returns {string} Deterministic semantic key for dedupe tracking.
 */
function buildSemanticDetailKey(detail) {
  if (!detail) {
    return "__no_detail__";
  }
  const scorePlayer = detail?.scores?.player ?? detail?.player;
  const scoreOpponent = detail?.scores?.opponent ?? detail?.opponent;
  const components = [
    detail?.roundIndex,
    detail?.round,
    detail?.version,
    detail?.payloadVersion,
    detail?.payloadHash,
    detail?.hash,
    detail?.remainingMs,
    detail?.state,
    detail?.to,
    scorePlayer,
    scoreOpponent,
    detail?.winner
  ];
  return components
    .map((value) => (value === undefined ? "__undefined__" : String(value)))
    .join("|");
}

/**
 * Decide whether an emitted value-only event should be suppressed as duplicate.
 *
 * @internal
 *
 * @pseudocode
 * 1. Skip dedupe for non-value events or authoritative control.state.changed.
 * 2. Build semantic key from event type + normalized payload identity.
 * 3. Compare against last seen key and suppress if identical.
 * 4. Store current key as last seen and allow emission when changed.
 *
 * @param {string} type - Event name.
 * @param {any} detail - Event payload.
 * @returns {boolean} True when event should be suppressed.
 */
function shouldSuppressDuplicateValueEvent(type, detail) {
  if (type === "control.state.changed") {
    return false;
  }
  if (!VALUE_ONLY_EVENT_TYPES.has(type)) {
    return false;
  }

  const dedupeKey = `${type}:${buildSemanticDetailKey(detail)}`;
  const lastSeenKey = lastSeenEventKeys.get(type);

  if (lastSeenKey === dedupeKey) {
    return true;
  }

  lastSeenEventKeys.set(type, dedupeKey);
  return false;
}

/**
 * Listen for a battle event.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Listener callback.
 * @summary Listen for a specific classic battle event.
 * @pseudocode
 * 1. Retrieve the shared target.
 * 2. Add `handler` as a listener.
 *
 * @returns {void}
 */
export function onBattleEvent(type, handler) {
  getTarget().addEventListener(type, handler);
}

/**
 * Stop listening for a battle event.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Listener callback.
 * @summary Remove a listener for a classic battle event.
 * @pseudocode
 * 1. Retrieve the shared target.
 * 2. Remove `handler`.
 *
 * @returns {void}
 */
export function offBattleEvent(type, handler) {
  getTarget().removeEventListener(type, handler);
}

/**
 * Dispatch a battle event with optional detail.
 *
 * @param {string} type - Event name.
 * @param {any} [detail] - Optional data for listeners.
 * @summary Notify listeners of a classic battle event.
 * @pseudocode
 * 1. Create a `CustomEvent` with the provided detail.
 * 2. Retrieve the shared target.
 * 3. Dispatch the event.
 *
 * @returns {void}
 */
export function emitBattleEvent(type, detail) {
  try {
    if (shouldSuppressDuplicateValueEvent(type, detail)) {
      eventLogger.debug(`Suppressed duplicate value event: ${type}`, detail);
      return;
    }

    // Debug logging for event emission
    logEventEmit(type, detail, { timestamp: Date.now() });

    getTarget().dispatchEvent(new CustomEvent(type, { detail }));
  } catch (error) {
    eventLogger.error(`Failed to emit event "${type}":`, error);
  }
}

/**
 * Dispatch a battle event with alias support for backward compatibility.
 *
 * @param {string} type - Event name (new or deprecated).
 * @param {any} [detail] - Optional data for listeners.
 * @param {object} [options] - Emission options.
 * @param {boolean} [options.skipAliases] - Skip emitting alias events.
 * @param {boolean} [options.warnDeprecated] - Warn about deprecated usage.
 * @summary Emit a battle event with backward-compatible aliases.
 * @pseudocode
 * 1. Check if event name is deprecated and map to its standard name.
 * 2. Emit the standardized event and any legacy aliases.
 * 3. Optionally warn about deprecated usage.
 *
 * @returns {void}
 */
export function emitBattleEventWithAliases(type, detail, options = {}) {
  try {
    // Debug logging for aliased event emission
    eventLogger.event(`Emitting with aliases: ${type}`, detail, { options });
    emitBattleEventWithAliasesCore(type, detail, options);
  } catch (error) {
    eventLogger.error(`Failed to emit aliased event "${type}":`, error);
    emitBattleEvent(type, detail);
  }
}

/**
 * Replace the shared `EventTarget` instance.
 *
 * @summary Refresh the global event bus.
 * @pseudocode
 * 1. Create a new `EventTarget`.
 * 2. Store it under `EVENT_TARGET_KEY` on `globalThis`.
 * 3. Stamp the target with a stable debug ID for identity tracking.
 *
 * @returns {void}
 */
export function __resetBattleEventTarget() {
  const t = new EventTarget();
  globalThis[EVENT_TARGET_KEY] = t;
  __tuneMaxListenersIfNode(t);

  // DIAGNOSTIC: Stamp EventTarget with stable ID for identity tracking
  t.__debugId = `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  t.__createdAt = new Date().toISOString();

  if (isVitest() || typeof window !== "undefined") {
    console.log(`[EventTarget] Reset to new target: ${t.__debugId} at ${t.__createdAt}`);
  }

  resetBattleEventDedupeState();
}

/**
 * Get the global EventTarget used by classic battle.
 *
 * @pseudocode
 * 1. Return the shared target via `getTarget()`.
 *
 * @returns {EventTarget}
 */
export function getBattleEventTarget() {
  return getTarget();
}
