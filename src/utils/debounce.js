/**
 * Create a debounced version of a function.
 *
 * @pseudocode
 * 1. Maintain an internal `timer` variable.
 * 2. Return a new function that returns a promise.
 * 3. Each call clears the existing `timer`.
 * 4. Start a new timer with the provided `delay`.
 * 5. When the timer fires, invoke `fn` with the latest arguments.
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
  return (...args) =>
    new Promise((resolve, reject) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          resolve(fn(...args));
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
}
