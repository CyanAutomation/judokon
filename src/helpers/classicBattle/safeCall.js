/**
 * Execute a function and return its result, swallowing any thrown error.
 *
 * @template T
 * @param {() => T} fn Callback to invoke.
 * @returns {T | undefined} Result of `fn` or `undefined` when it throws.
 * @pseudocode
 * ```
 * try → return fn()
 * catch → return undefined
 * ```
 */
export function safeCall(fn) {
  try {
    return fn();
  } catch {}
}
