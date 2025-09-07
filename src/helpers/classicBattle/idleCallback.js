/**
 * @summary Run a task when idle with timeout fallback.
 *
 * @pseudocode
 * 1. If `requestIdleCallback` exists:
 *    a. Wrap `fn` to ensure it runs only once.
 *    b. Schedule the wrapper with `requestIdleCallback` and set a timeout to
 *       cancel the idle callback and invoke the wrapper after `timeout` ms.
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
      let called = false;
      const wrappedFn = () => {
        if (!called) {
          called = true;
          fn();
        }
      };
      const id = window.requestIdleCallback(wrappedFn);
      window.setTimeout(() => {
        try {
          if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
        } catch {}
        wrappedFn();
      }, timeout);
    } else {
      queueMicrotask(fn);
    }
  } catch {
    fn();
  }
}
