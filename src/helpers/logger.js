/* Lightweight logger that stays silent during Vitest runs unless explicitly enabled.
 * Purpose: many modules use console.log at import or runtime for debug traces.
 * Tests already mute console in setup, but some logs can still escape. This
 * helper centralizes the gate so library code can opt-in to quieter output.
 */
const isVitest = typeof process !== "undefined" && !!process.env && !!process.env.VITEST;
const showTestLogs =
  typeof process !== "undefined" && !!process.env && !!process.env.SHOW_TEST_LOGS;

function shouldLog() {
  // In Vitest worker processes default to silence unless SHOW_TEST_LOGS is truthy.
  if (isVitest && !showTestLogs) return false;
  return true;
}

/**
 * Logs a general message to the console.
 *
 * @summary This function acts as a wrapper around `console.log`, conditionally
 * logging messages based on the `shouldLog()` check.
 *
 * @pseudocode
 * 1. Call `shouldLog()` to determine if logging is permitted in the current environment.
 * 2. If `shouldLog()` returns `false`, exit the function without logging.
 * 3. If `shouldLog()` returns `true`, forward all provided `args` to `console.log()`.
 *
 * @param {...any} args - The arguments to log.
 * @returns {void}
 */
export const log = (...args) => {

/**
 * Logs a debug message to the console.
 *
 * @summary This function acts as a wrapper around `console.debug`, conditionally
 * logging messages based on the `shouldLog()` check.
 *
 * @pseudocode
 * 1. Call `shouldLog()` to determine if debug logging is permitted.
 * 2. If `shouldLog()` returns `false`, exit.
 * 3. If `shouldLog()` returns `true`, forward all `args` to `console.debug()`.
 *
 * @param {...any} args - The arguments to log.
 * @returns {void}
 */
export const debug = (...args) => {

/**
 * Logs an informational message to the console.
 *
 * @summary This function acts as a wrapper around `console.info`, conditionally
 * logging messages based on the `shouldLog()` check.
 *
 * @pseudocode
 * 1. Call `shouldLog()` to determine if informational logging is permitted.
 * 2. If `shouldLog()` returns `false`, exit.
 * 3. If `shouldLog()` returns `true`, forward all `args` to `console.info()`.
 *
 * @param {...any} args - The arguments to log.
 * @returns {void}
 */
export const info = (...args) => {

/**
 * Logs a warning message to the console.
 *
 * @summary This function acts as a wrapper around `console.warn`. Warnings
 * are always surfaced, even during test runs, as they often indicate potential
 * issues that tests might need to assert on.
 *
 * @pseudocode
 * 1. Forward all provided `args` directly to `console.warn()`.
 *
 * @param {...any} args - The arguments to log as a warning.
 * @returns {void}
 */
export const warn = (...args) => {

/**
 * Logs an error message to the console.
 *
 * @summary This function acts as a wrapper around `console.error`. Errors
 * are always surfaced, even during test runs, as they indicate critical
 * issues that should not be suppressed.
 *
 * @pseudocode
 * 1. Forward all provided `args` directly to `console.error()`.
 *
 * @param {...any} args - The arguments to log as an error.
 * @returns {void}
 */
export const error = (...args) => {

export default { log, debug, info, warn, error };
