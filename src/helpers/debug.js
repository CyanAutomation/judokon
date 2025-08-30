/**
 * Debug logging utilities for the game.
 *
 * The `DEBUG_LOGGING` flag controls whether messages are printed. It can be set
 * via `process.env.DEBUG_LOGGING` in Node environments or `window.DEBUG_LOGGING`
 * in the browser. When enabled, the `debugLog` helper forwards arguments to
 * `console.log`.
 *
 * @pseudocode
 * 1. Check both `process.env` and `window` for the `DEBUG_LOGGING` flag.
 * 2. Export a function that logs arguments only when the flag is true.
 */

/**
 * Indicates whether debug messages should be printed.
 * Set `DEBUG_LOGGING=true` in the environment or on `window` to enable.
 * @type {boolean}
 */
export const DEBUG_LOGGING =
  (typeof process !== "undefined" && process.env.DEBUG_LOGGING === "true") ||
  (typeof window !== "undefined" && window.DEBUG_LOGGING === true);

/**
 * Log provided arguments when debugging is enabled.
 * @param {...unknown} args - Data passed to `console.log`.
 * @returns {void}
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
export function debugLog(...args) {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
}
