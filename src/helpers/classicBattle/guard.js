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
