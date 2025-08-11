/**
 * Create a debounced version of a function.
 *
 * @pseudocode
 * 1. Maintain internal `timer` and `pending` (resolve and reject handlers).
 * 2. Return a new function that returns a promise.
 * 3. On each call:
 *    - Clear the existing `timer`.
 *    - If a pending promise exists, reject it with `Error('Debounced')`.
 *    - Store the current promise's `resolve` and `reject` as `pending`.
 *    - Start a new timer with the provided `delay`.
 * 4. When the timer fires, invoke `fn` with the latest arguments.
 *    - Clear `pending`.
 *    - Resolve the promise with `fn`'s return value.
 *    - Reject if `fn` throws an error.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {(...args: Parameters<F>) => Promise<ReturnType<F>>} Debounced function.
 */
export function debounce(fn, delay) {
  let timer;
  /** @type {{resolve: (value: any) => void, reject: (reason?: any) => void} | undefined} */
  let pending;
  return (...args) =>
    new Promise((resolve, reject) => {
      clearTimeout(timer);
      if (pending) {
        pending.reject(new Error("Debounced"));
      }
      pending = { resolve, reject };
      timer = setTimeout(() => {
        const { resolve, reject } = pending;
        pending = undefined;
        try {
          resolve(fn(...args));
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
}
