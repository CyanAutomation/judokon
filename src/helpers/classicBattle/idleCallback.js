/**
 * @summary Run a task when idle with timeout fallback.
 *
 * @pseudocode
 * 1. If `requestIdleCallback` exists, schedule `fn` with it and also set a
 *    timeout to cancel the idle callback and run `fn` after `timeout` ms.
 * 2. Otherwise, queue a microtask to run `fn`.
 * 3. On any error, invoke `fn` immediately.
 *
 * @param {() => void} fn - Function to execute.
 * @param {number} [timeout=2000] - Fallback timeout in milliseconds.
 * @returns {void}
 */
export function runWhenIdle(fn, timeout = 2000) {
  try {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(fn);
      window.setTimeout(() => {
        try {
          if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
        } catch {}
        fn();
      }, timeout);
    } else {
      queueMicrotask(fn);
    }
  } catch {
    fn();
  }
}
