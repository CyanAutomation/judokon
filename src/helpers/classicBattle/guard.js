/**
 * Execute a function and suppress any thrown errors.
 *
 * Prevent exceptions from bubbling to callers. Use for best-effort
 * side-effects where failure must not interrupt the main flow.
 *
 * @pseudocode
 * 1. Try to invoke the provided `fn`.
 * 2. If `fn` throws, swallow the error and return.
 *
 * @param {() => void} fn - Callback to execute.
 * @returns {void}
 */
export function guard(fn) {
  try {
    fn();
  } catch {}
}

/**
 * Execute an async function and suppress any thrown errors or rejections.
 *
 * Await the provided callback and swallow any rejection or thrown error.
 * This is useful for fire-and-forget async side-effects where errors
 * should not affect the caller.
 *
 * @pseudocode
 * 1. Await the result of `fn()`.
 * 2. If it rejects, swallow the error and return.
 *
 * @param {() => Promise<any>|any} fn - Callback returning a promise or value.
 * @returns {Promise<void>}
 */
export async function guardAsync(fn) {
  try {
    await fn();
  } catch {}
}

/**
 * Schedule a guard callback with a timeout.
 *
 * @param {number} timeoutMs - Delay before invoking the guard.
 * @param {() => void} onTimeout - Callback executed on timeout.
 * @returns {() => void} cancel function to clear the guard.
 * @pseudocode
 * ```
 * id ← setTimeout(onTimeout, timeoutMs)
 * return () => clearTimeout(id)
 * ```
 */
export function scheduleGuard(timeoutMs, onTimeout) {
  const id = setTimeout(onTimeout, timeoutMs);
  return () => clearTimeout(id);
}
