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
export function debugLog(...args) {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
}
