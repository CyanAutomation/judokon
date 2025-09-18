/**
 * Utility functions for requestAnimationFrame patterns.
 */

/**
 * Debounce a function to run at most once per animation frame.
 *
 * @param {Function} fn - Function to debounce.
 * @returns {Function} Debounced function.
 */
export function rafDebounce(fn) {
  let rafId = null;
  let lastArgs;
  return function (...args) {
    lastArgs = args;
    if (rafId) cancelAnimationFrame(rafId);
    // In test mode, run immediately to avoid frame delays
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      rafId = null;
      fn.apply(this, lastArgs);
    } else {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        fn.apply(this, lastArgs);
      });
    }
  };
}

/**
 * Run a function after a specified number of animation frames.
 *
 * @param {number} n - Number of frames to wait.
 * @param {Function} fn - Function to run.
 */
export function runAfterFrames(n, fn) {
  if (n <= 0) {
    fn();
    return;
  }
  requestAnimationFrame(() => runAfterFrames(n - 1, fn));
}

/**
 * Run a work function with a time budget per frame, yielding to the next frame if budget is exceeded.
 *
 * @param {Function} workFn - Function that performs work and returns true if more work remains, false if done.
 * @param {number} budgetMs - Time budget in milliseconds per frame.
 */
export function withFrameBudget(workFn, budgetMs = 5) {
  const start = performance.now();
  while (workFn() && performance.now() - start < budgetMs) {
    // Continue work within budget
  }
  if (workFn()) {
    // More work remains, schedule next frame
    requestAnimationFrame(() => withFrameBudget(workFn, budgetMs));
  }
}
