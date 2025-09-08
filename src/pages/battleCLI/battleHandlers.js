const handlers = {};

/**
 * Register battle CLI key handlers.
 *
 * @description
 * The orchestrator initializes the concrete handlers and calls this function
 * to provide implementations. The registered handlers are stored in a
 * private `handlers` object used by the exported wrapper functions.
 *
 * @pseudocode
 * 1. Accept an object `h` containing handler functions for various battle states.
 * 2. Merge the provided handlers into the internal `handlers` registry.
 *
 * @param {Object} h - Object with handler functions (e.g., handleGlobalKey).
 */
export function registerBattleHandlers(h) {
  Object.assign(handlers, h);
}

/**
 * Wrapper that delegates a global key to the registered handler.
 *
 * @param {string} key - Key string (lowercased preferred).
 * @returns {boolean} True if the key was handled.
 *
 * @pseudocode
 * 1. Call `handlers.handleGlobalKey(key)` and return its boolean result.
 */
export const handleGlobalKey = (key) => handlers.handleGlobalKey(key);

/**
 * Wrapper for the 'waitingForPlayerAction' state key handler.
 *
 * @param {string} key - Key string.
 * @returns {boolean}
 * @pseudocode
 * 1. Call the registered `handleWaitingForPlayerActionKey` with `key`.
 */
export const handleWaitingForPlayerActionKey = (key) =>
  handlers.handleWaitingForPlayerActionKey(key);

/**
 * Wrapper for the 'roundOver' state key handler.
 *
 * @param {string} key - Key string.
 * @returns {boolean}
 */
export const handleRoundOverKey = (key) => handlers.handleRoundOverKey(key);

/**
 * Wrapper for the 'cooldown' state key handler.
 *
 * @param {string} key - Key string.
 * @returns {boolean}
 */
export const handleCooldownKey = (key) => handlers.handleCooldownKey(key);

/**
 * Wrapper for arrow navigation inside the stat list.
 *
 * @param {string} key - Arrow key string.
 * @returns {boolean}
 */
export const handleStatListArrowKey = (key) => handlers.handleStatListArrowKey(key);
