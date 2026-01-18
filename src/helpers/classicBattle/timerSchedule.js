/**
 * @summary Safe and consistent timer/timestamp utilities for battleClassic initialization.
 * @description Additional utilities for delay scheduling and timestamp management beyond timerUtils.js.
 * @file classicBattle/timerSchedule.js
 */

/**
 * Get current timestamp using performance.now() with Date.now() fallback.
 *
 * @returns {number} Current timestamp in milliseconds.
 *
 * @pseudocode
 * 1. Prefer performance.now when available for monotonic precision.
 * 2. Fall back to Date.now when performance is unavailable or throws.
 * 3. Return 0 if all timestamp sources fail.
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
 * @returns {number|null} Timeout ID if scheduled successfully, null otherwise.
 *
 * @pseudocode
 * 1. Try window.setTimeout first if available and capture the returned timeout ID.
 * 2. Fall back to global setTimeout and capture the returned timeout ID.
 * 3. Return null if both fail.
 */
export function scheduleDelayed(fn, delayMs) {
  try {
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      const timeoutId = window.setTimeout(fn, delayMs);
      const normalizedId = Number(timeoutId);

      return Number.isFinite(normalizedId) ? normalizedId : null;
    }
  } catch {}

  try {
    if (typeof setTimeout === "function") {
      const timeoutId = setTimeout(fn, delayMs);
      const normalizedId = Number(timeoutId);

      return Number.isFinite(normalizedId) ? normalizedId : null;
    }
  } catch {}

  return null;
}

/**
 * Clear a scheduled timeout if the ID is valid.
 *
 * @param {number|null} timeoutId - Timer ID to clear.
 * @returns {boolean} True if cleared, false otherwise.
 *
 * @pseudocode
 * 1. Validate the timeoutId to ensure it is a finite, positive number (not null, 0, or undefined).
 * 2. Attempt to clear the timeout and report success.
 * 3. On failure or invalid input, return false.
 */
export function clearScheduled(timeoutId) {
  const normalizedId =
    typeof timeoutId === "object" && timeoutId !== null ? Number(timeoutId) : timeoutId;

  if (!Number.isFinite(normalizedId) || normalizedId === 0 || normalizedId === null) {
    return false;
  }

  try {
    clearTimeout(normalizedId);
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
 *
 * @pseudocode
 * 1. Capture the current timestamp using getCurrentTimestamp().
 * 2. Subtract the current timestamp from the deadline to compute the delta.
 * 3. Clamp the result at 0 to avoid negative remaining time.
 */
export function calculateRemaining(deadlineTimestamp) {
  const now = getCurrentTimestamp();
  return Math.max(0, deadlineTimestamp - now);
}
