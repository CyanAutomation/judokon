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
 * @returns {void}
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
 * Wrapper for the 'waitingForMatchStart' state key handler.
 *
 * @param {string} key - Key string.
 * @returns {boolean}
 * @pseudocode
 * 1. Call the registered `handleWaitingForMatchStartKey` with `key` and return its result.
 */
export const handleWaitingForMatchStartKey = (key) => handlers.handleWaitingForMatchStartKey(key);

/**
 * Delegate wrapper for the 'roundOver' state key handler.
 *
 * @param {string} key - Key string.
 * @returns {boolean} True when handled by the registered implementation.
 *
 * @pseudocode
 * 1. Call the registered `handleRoundOverKey` with `key` and return its result.
 */
export const handleRoundOverKey = (key) => handlers.handleRoundOverKey(key);

/**
 * Delegate wrapper for the 'cooldown' state key handler.
 *
 * @param {string} key - Key string.
 * @returns {boolean}
 *
 * @pseudocode
 * 1. Call the registered `handleCooldownKey` with `key` and return its result.
 */
export const handleCooldownKey = (key) => handlers.handleCooldownKey(key);

/**
 * Delegate wrapper for arrow navigation inside the stat list.
 *
 * @param {string} key - Arrow key string.
 * @returns {boolean}
 *
 * @pseudocode
 * 1. Call the registered `handleStatListArrowKey` with `key` and return its result.
 */
export const handleStatListArrowKey = (key) => handlers.handleStatListArrowKey(key);

/**
 * Delegate wrapper for navigating the command history buffer.
 *
 * @param {string} key - Arrow key string triggering history navigation.
 * @returns {boolean} True when the registered handler consumed the key.
 *
 * @pseudocode
 * 1. Call the registered `handleCommandHistory` with `key` and return its result.
 */
export const handleCommandHistory = (key) => handlers.handleCommandHistory(key);
