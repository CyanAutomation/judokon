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
 * Logs provided arguments to the console only when debug logging is enabled.
 *
 * @summary This function acts as a conditional logger, preventing debug messages
 * from appearing in production environments unless explicitly enabled.
 *
 * @pseudocode
 * 1. Check the value of the `DEBUG_LOGGING` constant.
 * 2. If `DEBUG_LOGGING` is `true`, forward all `args` to `console.log()`.
 * 3. If `DEBUG_LOGGING` is `false`, do nothing.
 *
 * @param {...unknown} args - Any number of arguments to be logged.
 * @returns {void}
 */
export function debugLog(...args) {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
}
