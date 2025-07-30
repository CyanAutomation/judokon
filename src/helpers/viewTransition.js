/**
 * Execute a function within a View Transition when supported.
 *
 * @pseudocode
 * 1. Check if `document.startViewTransition` exists.
 * 2. If available, call `document.startViewTransition(fn)`.
 * 3. Otherwise, invoke `fn` directly.
 *
 * @param {Function} fn - Operation to run inside the transition.
 * @returns {Promise<void>|void} Result of the call.
 */
export function withViewTransition(fn) {
  if (typeof document !== "undefined" && document.startViewTransition) {
    return document.startViewTransition(fn);
  }
  return fn();
}
