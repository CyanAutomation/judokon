/**
 * @summary Safe and consistent timer/timestamp utilities for battleClassic initialization.
 * @description Additional utilities for delay scheduling and timestamp management beyond timerUtils.js.
 * @file classicBattle/timerSchedule.js
 */

/**
 * Get current timestamp using performance.now() with Date.now() fallback.
 *
 * @returns {number} Current timestamp in milliseconds.
 */
export function getCurrentTimestamp() {
  try {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
  } catch {}

  try {
    return Date.now();
  } catch {}

  return 0;
}

/**
 * Schedule a function to run after a delay, with fallback handling.
 *
 * @param {Function} fn - Function to execute.
 * @param {number} delayMs - Delay in milliseconds.
 * @returns {boolean} True if scheduled successfully, false otherwise.
 *
 * @pseudocode
 * 1. Try window.setTimeout first if available.
 * 2. Fall back to global setTimeout.
 * 3. Return false if both fail.
 */
export function scheduleDelayed(fn, delayMs) {
  try {
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      window.setTimeout(fn, delayMs);
      return true;
    }
  } catch {}

  try {
    if (typeof setTimeout === "function") {
      setTimeout(fn, delayMs);
      return true;
    }
  } catch {}

  return false;
}

/**
 * Clear a scheduled timeout if the ID is valid.
 *
 * @param {number|null} timeoutId - Timer ID to clear.
 * @returns {boolean} True if cleared, false otherwise.
 */
export function clearScheduled(timeoutId) {
  if (!Number.isFinite(timeoutId) || timeoutId === 0) {
    return false;
  }

  try {
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate remaining time until a deadline.
 *
 * @param {number} deadlineTimestamp - Target timestamp.
 * @returns {number} Remaining milliseconds (0 or positive if time remains, negative if expired).
 */
export function calculateRemaining(deadlineTimestamp) {
  const now = getCurrentTimestamp();
  return Math.max(0, deadlineTimestamp - now);
}
