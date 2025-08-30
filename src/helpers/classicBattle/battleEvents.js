/**
 * Lightweight event bus for Classic Battle interactions.
 *
 * @pseudocode
 * 1. Retrieve a shared `EventTarget` from `globalThis` using a fixed key.
 * 2. Create it if missing.
 * 3. Provide helpers to subscribe, unsubscribe, emit, and reset events.
 */
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
 * 1. Look up `EVENT_TARGET_KEY` on `globalThis`.
 * 2. Create a new `EventTarget` if none exists.
 * 3. Return the stored target.
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
 */
export function emitBattleEvent(type, detail) {
  const event = new CustomEvent(type, { detail });
  getTarget().dispatchEvent(event);
  try {
    document.dispatchEvent(event);
  } catch {}
}

/**
 * Replace the shared `EventTarget` instance.
 *
 * @summary Refresh the global event bus.
 * @pseudocode
 * 1. Create a new `EventTarget`.
 * 2. Store it under `EVENT_TARGET_KEY` on `globalThis`.
 */
export function __resetBattleEventTarget() {
  const t = new EventTarget();
  globalThis[EVENT_TARGET_KEY] = t;
  __tuneMaxListenersIfNode(t);
}

export { getTarget as getBattleEventTarget };
export default getTarget;
