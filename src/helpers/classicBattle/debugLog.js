import { debug as baseDebug } from "../logger.js";

function hasFlag(target, flag) {
  try {
    return Boolean(target?.[flag]);
  } catch {
    return false;
  }
}

function isDebugFlagEnabled() {
  if (typeof process !== "undefined" && Boolean(process.env?.SHOW_TEST_LOGS)) {
    return true;
  }
  if (hasFlag(typeof window !== "undefined" ? window : undefined, "__SHOW_TEST_LOGS")) {
    return true;
  }
  return hasFlag(typeof globalThis !== "undefined" ? globalThis : undefined, "__SHOW_TEST_LOGS");
}

/**
 * Determines whether debug logs should be emitted for classic battle helpers.
 *
 * @pseudocode
 * IF isDebugFlagEnabled() returns true THEN return true
 * RETURN false
 *
 * @returns {boolean} True when debug logs should be emitted.
 */
export function shouldEmitDebugLogs() {
  return isDebugFlagEnabled();
}

/**
 * Conditionally logs debug messages based on runtime and flag checks.
 *
 * @pseudocode
 * IF shouldEmitDebugLogs() returns false THEN return early
 * IF data is undefined THEN call baseDebug with message only
 * ELSE call baseDebug with message and data
 *
 * @param {string} message - Message to log when debugging.
 * @param {*} [data] - Optional data payload for richer logs.
 * @returns {void}
 */
export function debugLog(message, data) {
  if (!shouldEmitDebugLogs()) return;
  if (typeof data === "undefined") {
    baseDebug(message);
    return;
  }
  baseDebug(message, data);
}

export default { debugLog, shouldEmitDebugLogs };
