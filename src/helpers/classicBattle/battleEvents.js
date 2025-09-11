/**
 * Lightweight event bus for Classic Battle interactions.
 *
 * @pseudocode
 * 1. Retrieve a shared `EventTarget` from `globalThis` using a fixed key.
 * 2. Create it if missing.
 * 3. Provide helpers to subscribe, unsubscribe, emit, and reset events.
 */
import { logEventEmit, createComponentLogger } from "./debugLogger.js";

const eventLogger = createComponentLogger("BattleEvents");
const EVENT_TARGET_KEY = "__classicBattleEventTarget";

function __tuneMaxListenersIfNode(target) {
  try {
    // Only in Node/Vitest: remove listener cap for this EventTarget
    const isVitest = typeof process !== "undefined" && !!process.env?.VITEST;
    if (!isVitest || !target) return;
    // Defer import to avoid bundling 'events' in the browser build
    queueMicrotask(async () => {
      try {
        const events = await import("events");
        if (typeof events.setMaxListeners === "function") {
          events.setMaxListeners(0, target);
        }
      } catch {}
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
 * 3. Return the existing or newly created event target.
 */
function getTarget() {
  if (!globalThis[EVENT_TARGET_KEY]) {
    const t = new EventTarget();
    globalThis[EVENT_TARGET_KEY] = t;
    __tuneMaxListenersIfNode(t);
  }
  return globalThis[EVENT_TARGET_KEY];
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
    // Debug logging for event emission
    logEventEmit(type, detail, { timestamp: Date.now() });

    getTarget().dispatchEvent(new CustomEvent(type, { detail }));
  } catch (error) {
    console.error(`[battleEvents] Failed to emit event "${type}":`, error);
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

    // Dynamic import to avoid circular dependencies
    import("/src/helpers/classicBattle/eventAliases.js").then(
      ({ emitBattleEventWithAliases: aliasEmitter }) => {
        aliasEmitter(type, detail, options);
      }
    );

    // Fallback: emit standard event immediately
    getTarget().dispatchEvent(new CustomEvent(type, { detail }));
  } catch (error) {
    console.error(`[battleEvents] Failed to emit aliased event "${type}":`, error);
    // Fallback to standard emission
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
 *
 * @returns {void}
 */
export function __resetBattleEventTarget() {
  const t = new EventTarget();
  globalThis[EVENT_TARGET_KEY] = t;
  __tuneMaxListenersIfNode(t);
}
/**
 * @summary Low-level helpers for testing and cross-module coordination.
 * @pseudocode
 * 1. Provide a stable global EventTarget so isolated modules and tests can
 *    share a single event bus without importing runtime instances.
 * 2. Expose small helpers (`onBattleEvent`, `offBattleEvent`, `emitBattleEvent`)
 *    to keep call-sites terse and readable.
 */
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
export { getTarget };
export default getTarget;
