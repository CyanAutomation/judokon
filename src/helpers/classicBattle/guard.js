/**
 * Execute a function and suppress any thrown errors.
 *
 * @param {() => void} fn - Callback to execute.
 */
export function guard(fn) {
  try {
    fn();
  } catch {}
}

/**
 * Execute an async function and suppress any thrown errors or rejections.
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
