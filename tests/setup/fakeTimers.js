/**
 * Canonical fake timers setup for JU-DO-KON! tests.
 * Provides consistent timer mocking with proper cleanup and async helpers.
 *
 * @pseudocode
 * - useCanonicalTimers(): Setup fake timers with teardown
 * - runAllTimersAsync(): Execute all pending timers asynchronously
 * - advanceTimersByTimeAsync(ms): Advance time and execute timers asynchronously
 * - withFakeTimers(fn): Auto-setup/teardown wrapper for test functions
 */

import { vi } from "vitest";

/**
 * Setup canonical fake timers with automatic teardown.
 * Use this instead of calling vi.useFakeTimers() directly.
 *
 * @returns {Object} Timer control object with cleanup method
 */
export function useCanonicalTimers() {
  vi.useFakeTimers();

  const timers = {
    cleanup: () => {
      vi.useRealTimers();
      if (typeof globalThis !== "undefined") {
        if (globalThis.timer === timers) {
          delete globalThis.timer;
        }
        if (globalThis.timers === timers) {
          delete globalThis.timers;
        }
      }
    },
    runAllTimers: () => vi.runAllTimers(),
    runAllTimersAsync: () => vi.runAllTimersAsync(),
    advanceTimersByTime: (ms) => vi.advanceTimersByTime(ms),
    advanceTimersByTimeAsync: (ms) => vi.advanceTimersByTimeAsync(ms),
    runOnlyPendingTimers: () => vi.runOnlyPendingTimers(),
    runOnlyPendingTimersAsync: () => vi.runOnlyPendingTimersAsync()
  };

  if (typeof globalThis !== "undefined") {
    globalThis.timer = timers;
    globalThis.timers = timers;
  }

  return timers;
}

/**
 * Auto-setup/teardown wrapper for tests that need fake timers.
 * Use this for tests that need timer control throughout their execution.
 *
 * @param {Function} testFn - The test function to wrap
 * @returns {*} Result of the test function
 */
export function withFakeTimers(testFn) {
  vi.useFakeTimers();
  try {
    return testFn();
  } finally {
    vi.useRealTimers();
  }
}

/**
 * Helper to run all pending timers asynchronously.
 * Use this instead of vi.runAllTimersAsync() directly for consistency.
 *
 * @returns {Promise} Promise that resolves when all timers have executed
 */
export async function runAllTimersAsync() {
  return vi.runAllTimersAsync();
}

/**
 * Helper to advance timers by a specific amount of time asynchronously.
 * Use this instead of vi.advanceTimersByTimeAsync() directly for consistency.
 *
 * @param {number} ms - Milliseconds to advance
 * @returns {Promise} Promise that resolves when timers have executed
 */
export async function advanceTimersByTimeAsync(ms) {
  return vi.advanceTimersByTimeAsync(ms);
}

/**
 * Helper to run only currently pending timers asynchronously.
 * Useful for testing timer scheduling without advancing time.
 *
 * @returns {Promise} Promise that resolves when pending timers have executed
 */
export async function runOnlyPendingTimersAsync() {
  return vi.runOnlyPendingTimersAsync();
}
