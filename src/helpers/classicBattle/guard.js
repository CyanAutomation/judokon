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
