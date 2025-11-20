/**
 * @summary Safe execution wrapper for error handling with conditional logging.
 * @description Standardizes try-catch patterns and provides consistent error handling
 * across the battleClassic initialization code.
 */

/**
 * Levels of error logging/handling severity.
 * @enum {string}
 */
export const ERROR_LEVELS = {
  SILENT: "silent",
  DEBUG: "debug",
  WARN: "warn",
  ERROR: "error"
};

/**
 * Execute a function safely with standardized error handling.
 *
 * @param {Function} fn - The function to execute.
 * @param {string} [context="operation"] - Description of the operation for logs.
 * @param {string} [errorLevel="debug"] - Logging level from ERROR_LEVELS.
 * @param {any} [fallback=null] - Value to return if execution fails.
 * @returns {any} Result of fn() or fallback value on error.
 *
 * @pseudocode
 * 1. Execute fn() within try block.
 * 2. On error, log based on errorLevel (silent, debug, warn, error).
 * 3. Return fallback value if execution fails.
 */
export function safeExecute(fn, context = "operation", errorLevel = "debug", fallback = null) {
  try {
    return fn();
  } catch (err) {
    if (errorLevel === ERROR_LEVELS.SILENT) {
      return fallback;
    }

    const logger = getLogger(errorLevel);
    if (logger) {
      logger(`battleClassic: ${context} failed`, err);
    }
    return fallback;
  }
}

/**
 * Get the appropriate console logger based on error level.
 *
 * @private
 * @param {string} level - Error level from ERROR_LEVELS.
 * @returns {Function|null} Console method or null if silent.
 */
function getLogger(level) {
  if (typeof console === "undefined") return null;

  switch (level) {
    case ERROR_LEVELS.DEBUG:
      return typeof console.debug === "function" ? console.debug : null;
    case ERROR_LEVELS.WARN:
      return typeof console.warn === "function" ? console.warn : null;
    case ERROR_LEVELS.ERROR:
      return typeof console.error === "function" ? console.error : null;
    case ERROR_LEVELS.SILENT:
    default:
      return null;
  }
}

/**
 * Execute async function safely with error handling.
 *
 * @param {AsyncFunction} fn - The async function to execute.
 * @param {string} [context="async operation"] - Description of the operation.
 * @param {string} [errorLevel="debug"] - Logging level.
 * @param {any} [fallback=null] - Value to return on error.
 * @returns {Promise<any>} Result promise or fallback on error.
 *
 * @pseudocode
 * 1. Attempt to await the provided async function.
 * 2. When an error occurs, short-circuit if SILENT logging is requested.
 * 3. Otherwise, resolve the appropriate logger and emit the failure message.
 * 4. Return the provided fallback value after logging.
 */
export async function safeExecuteAsync(
  fn,
  context = "async operation",
  errorLevel = "debug",
  fallback = null
) {
  try {
    return await fn();
  } catch (err) {
    if (errorLevel === ERROR_LEVELS.SILENT) {
      return fallback;
    }

    const logger = getLogger(errorLevel);
    if (logger) {
      logger(`battleClassic: ${context} failed`, err);
    }
    return fallback;
  }
}
