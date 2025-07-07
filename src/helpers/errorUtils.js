/**
 * Executes a (possibly async) generator function and logs errors.
 *
 * @pseudocode
 * 1. Call the provided function `fn` inside a try/catch block.
 *    - Await the result in case `fn` returns a promise.
 *
 * 2. If the call succeeds, return the result.
 *
 * 3. If the call throws an error:
 *    - Log `errorMsg` along with the error to the console.
 *    - Return the provided `fallback` value.
 *
 * @param {Function} fn - Function to execute.
 * @param {string} errorMsg - Message prefix for `console.error`.
 * @param {*} [fallback=""] - Value returned if `fn` throws.
 * @returns {Promise<*>} Result of `fn` or the fallback value.
 */
export async function safeGenerate(fn, errorMsg, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMsg, error);
    if (typeof fallback === "function") {
      return fallback(error);
    }
    if (typeof fallback === "undefined") {
      return undefined;
    }
    return fallback;
  }
}
