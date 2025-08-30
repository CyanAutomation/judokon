/**
 * Create a debounced version of a function.
 *
 * @pseudocode
 * 1. Maintain internal `timer` and `pending` (resolve, reject, args).
 * 2. Return a new function that returns a promise and exposes `flush`.
 * 3. On each call:
 *    - Clear the existing `timer`.
 *    - If a pending promise exists:
 *       - Reject with `DebounceError` unless suppression is enabled.
 *       - Invoke `onCancel` callback if provided.
 *    - Store the current promise's `resolve` and `reject` as `pending`.
 *    - Start a new timer with the provided `delay`.
 * 4. When the timer fires or `flush` is invoked:
 *    - Clear `pending`.
 *    - Resolve the promise with `fn`'s return value.
 *    - Reject if `fn` throws an error.
 */
export class DebounceError extends Error {
  /** @param {string} [message="Debounced"] */
  constructor(message = "Debounced") {
    super(message);
    this.name = "DebounceError";
  }
}

/**
 * @template {(...args: any[]) => any} F
 * @param {F} fn - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @param {{
 *   suppressRejection?: boolean,
 *   onCancel?: (error: DebounceError) => void,
 *   setTimeout?: typeof setTimeout,
 *   clearTimeout?: typeof clearTimeout
 * }} [options]
 * @returns {((...args: Parameters<F>) => Promise<ReturnType<F>>)&{flush: () => void}} Debounced function.
 */
/**
 * Create a debounced wrapper that returns a promise and supports flushing.
 *
 * @summary Returns a debounced async wrapper around `fn` that exposes `.flush()`.
 * @pseudocode
 * 1. Track a pending promise and a scheduled timer.
 * 2. On each call, clear the existing timer and reject the prior pending promise
 *    (or resolve it when `suppressRejection` is set) while invoking `onCancel`.
 * 3. Schedule `fn` to run after `delay`; resolve or reject the pending promise
 *    with `fn`'s result or thrown error.
 * 4. Provide `.flush()` to synchronously run any pending invocation immediately.
 *
 * @param {Function} fn - Function to debounce.
 * @param {number} delay - Milliseconds to wait before invoking `fn`.
 * @param {object} [options] - Optional settings.
 * @param {boolean} [options.suppressRejection] - Resolve previous pending promise instead of rejecting.
 * @param {(error: DebounceError) => void} [options.onCancel] - Callback invoked when a pending call is canceled.
 * @returns {Function & {flush: () => void}} Debounced function returning a Promise and exposing `.flush()`.
 */
export function debounce(
  fn,
  delay,
  {
    suppressRejection = false,
    onCancel,
    setTimeout: set = setTimeout,
    clearTimeout: clear = clearTimeout
  } = {}
) {
  /** @type {*} */
  let timer;
  /** @type {{resolve: (value: any) => void, reject: (reason?: any) => void, args: any[]} | undefined} */
  let pending;

  const run = () => {
    if (!pending) return;
    const { resolve, reject, args } = pending;
    pending = undefined;
    try {
      resolve(fn(...args));
    } catch (error) {
      reject(error);
    }
  };

  const debounced = /** @type {any} */ (
    (...args) =>
      new Promise((resolve, reject) => {
        clear(timer);
        if (pending) {
          const error = new DebounceError();
          if (suppressRejection) {
            pending.resolve();
          } else {
            pending.reject(error);
          }
          onCancel?.(error);
        }
        pending = { resolve, reject, args };
        timer = set(() => {
          run();
        }, delay);
      })
  );

  debounced.flush = () => {
    clear(timer);
    run();
  };

  return debounced;
}
