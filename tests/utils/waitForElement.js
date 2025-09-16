/**
 * waitForElement(selector, options)
 * - selector: string CSS selector or function that returns element
 * - options: { timeout = 5000, interval = 20 }
 *
 * Resolves with the found element or rejects after timeout or if document
 * is not available (teardown detected).
 */
export default function waitForElement(selector, { timeout = 5000, interval = 20 } = {}) {
  const isFunction = typeof selector === "function";
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let timerId = null;

    const clear = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const lookup = () => {
      try {
        if (typeof document === "undefined") {
          clear();
          return reject(new Error("document is undefined (teardown detected)"));
        }

        const el = isFunction ? selector() : document.querySelector(selector);
        if (el) {
          clear();
          return resolve(el);
        }

        if (Date.now() - start > timeout) {
          clear();
          return reject(new Error(`waitForElement timed out waiting for ${String(selector)}`));
        }

        timerId = setTimeout(lookup, interval);
      } catch (err) {
        clear();
        return reject(err);
      }
    };

    lookup();
  });
}
