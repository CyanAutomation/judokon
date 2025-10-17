import { debug as baseDebug } from "../logger.js";

function hasFlag(target, flag) {
  try {
    return Boolean(target?.[flag]);
  } catch {
    return false;
  }
}

function isPlaywrightRuntime() {
  if (hasFlag(typeof globalThis !== "undefined" ? globalThis : undefined, "__PLAYWRIGHT_TEST__")) {
    return true;
  }
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    if (/Playwright/i.test(ua)) return true;
    if (navigator.webdriver) return true;
  }
  return false;
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

export function shouldEmitDebugLogs() {
  if (isDebugFlagEnabled()) {
    return true;
  }
  if (isPlaywrightRuntime()) {
    return false;
  }
  return false;
}

export function debugLog(message, data) {
  if (!shouldEmitDebugLogs()) return;
  if (typeof data === "undefined") {
    baseDebug(message);
    return;
  }
  baseDebug(message, data);
}

export default { debugLog, shouldEmitDebugLogs };
