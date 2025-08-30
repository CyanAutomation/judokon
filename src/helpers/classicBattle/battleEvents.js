/**
 * Lightweight event bus for Classic Battle interactions.
 *
 * @pseudocode
 * 1. Retrieve a shared `EventTarget` from `globalThis` using a fixed key.
 * 2. Create and cache it if missing.
 * 3. Provide helpers to subscribe, unsubscribe, emit, and reset events.
 */
const EVENT_TARGET_KEY = "__classicBattleEventTarget";
let target = (globalThis[EVENT_TARGET_KEY] ||= new EventTarget());

/**
 * Listen for a battle event.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Listener callback.
 * @summary Listen for a specific classic battle event.
 * @pseudocode
 * 1. Add `handler` as a listener on the shared target.
 */
export function onBattleEvent(type, handler) {
  target.addEventListener(type, handler);
}

/**
 * Stop listening for a battle event.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Listener callback.
 * @summary Remove a listener for a classic battle event.
 * @pseudocode
 * 1. Remove `handler` from the shared target.
 */
export function offBattleEvent(type, handler) {
  target.removeEventListener(type, handler);
}

/**
 * Dispatch a battle event with optional detail.
 *
 * @param {string} type - Event name.
 * @param {any} [detail] - Optional data for listeners.
 * @summary Notify listeners of a classic battle event.
 * @pseudocode
 * 1. Create a `CustomEvent` with the provided detail.
 * 2. Dispatch it on the shared target.
 */
export function emitBattleEvent(type, detail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

/**
 * Replace the shared `EventTarget` instance.
 *
 * @summary Refresh the global event bus and local reference.
 * @pseudocode
 * 1. Create a new `EventTarget`.
 * 2. Store it under `EVENT_TARGET_KEY` on `globalThis`.
 * 3. Reassign the module-scoped `target`.
 */
export function __resetBattleEventTarget() {
  target = globalThis[EVENT_TARGET_KEY] = new EventTarget();
}

export { target as default };
