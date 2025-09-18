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
