/**
 * Lightweight event bus for Classic Battle interactions.
 *
 * @pseudocode
 * 1. Create a shared `EventTarget` instance.
 * 2. Expose helper functions to subscribe, unsubscribe, and emit events.
 */
let target = new EventTarget();

/**
 * Subscribe to a battle event.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Listener callback.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function onBattleEvent(type, handler) {
  target.addEventListener(type, handler);
}

/**
 * Unsubscribe from a battle event.
 *
 * @param {string} type - Event name.
 * @param {(e: CustomEvent) => void} handler - Listener callback.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function offBattleEvent(type, handler) {
  target.removeEventListener(type, handler);
}

/**
 * Emit a battle event with optional detail payload.
 *
 * @param {string} type - Event name.
 * @param {any} [detail] - Optional data to pass to listeners.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function emitBattleEvent(type, detail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

export default target;

// Test-only: reset the internal EventTarget so new listeners can bind
// against a fresh bus after module mocks change.
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function __resetBattleEventTarget() {
  target = new EventTarget();
}
