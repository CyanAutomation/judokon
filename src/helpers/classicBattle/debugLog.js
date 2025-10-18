import { debug as baseDebug } from "../logger.js";

const DEBUG_FLAG_NAMES = ["__SHOW_TEST_LOGS__", "__SHOW_TEST_LOGS", "SHOW_TEST_LOGS"];

function hasFlag(target, flag) {
  try {
    return Boolean(target?.[flag]);
  } catch {
    return false;
  }
}

function hasAnyDebugFlag(target) {
  return DEBUG_FLAG_NAMES.some((flag) => hasFlag(target, flag));
}

function isDebugFlagEnabled() {
  if (typeof process !== "undefined" && Boolean(process.env?.SHOW_TEST_LOGS)) {
    return true;
  }
  if (hasAnyDebugFlag(typeof window !== "undefined" ? window : undefined)) {
    return true;
  }
  return hasAnyDebugFlag(typeof globalThis !== "undefined" ? globalThis : undefined);
}

function isPlaywrightRuntime() {
  try {
    return Boolean(typeof globalThis !== "undefined" && globalThis.__PLAYWRIGHT_TEST__);
  } catch {
    return false;
  }
}

/**
 * Determine whether debug output should be suppressed in Playwright.
 *
 * @returns {boolean}
 * @pseudocode
 * IF isPlaywrightRuntime() AND NOT isDebugFlagEnabled() THEN return true
 * RETURN false
 */
export function shouldSuppressDebugOutput() {
  return isPlaywrightRuntime() && !isDebugFlagEnabled();
}

/**
 * Determine whether debug logging should be emitted for classic battles.
 *
 * @returns {boolean}
 * @pseudocode
 * IF isDebugFlagEnabled() returns true THEN return true
 * RETURN false
 *
 * @returns {boolean} True when debug logs should be emitted.
 * if isDebugFlagEnabled() -> return true
 * if isPlaywrightRuntime() -> return false
 * return false
 */
export function shouldEmitDebugLogs() {
  return isDebugFlagEnabled();
}

/**
 * Emit a debug log message when logging is enabled.
 *
 * @param {string} message
 * @param {unknown} [data]
 * @returns {void}
 * @pseudocode
 * if !shouldEmitDebugLogs() -> return
 * if data is undefined -> baseDebug(message)
 * else -> baseDebug(message, data)
 */
export function debugLog(message, data) {
  if (!shouldEmitDebugLogs() || shouldSuppressDebugOutput()) return;
  if (typeof data === "undefined") {
    baseDebug(message);
    return;
  }
  baseDebug(message, data);
}

export default { debugLog, shouldEmitDebugLogs, shouldSuppressDebugOutput };
