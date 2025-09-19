import { realScheduler } from "../scheduler.js";

/**
 * @summary Schedule a fallback timeout and return its id.
 *
 * @pseudocode
 * 1. Select the provided scheduler when it exposes `setTimeout`.
 * 2. Invoke `setTimeout` to schedule the callback.
 * 3. Return the timer id on success or `null` when scheduling fails.
 *
 * @param {number} ms - Delay in milliseconds.
 * @param {Function} cb - Callback to execute after the delay.
 * @param {{setTimeout?: Function}|undefined} [scheduler] - Optional scheduler override.
 * @returns {ReturnType<typeof setTimeout>|null} Timer identifier or null when scheduling fails.
 */
export function setupFallbackTimer(ms, cb, scheduler) {
  const activeScheduler =
    scheduler && typeof scheduler.setTimeout === "function" ? scheduler : realScheduler;
  try {
    return activeScheduler.setTimeout(cb, ms);
  } catch {
    return null;
  }
}
