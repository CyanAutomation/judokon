/**
 * Lightweight timeout-based scheduler used for countdowns.
 *
 * Exposes `setTimeout`/`clearTimeout` so tests can inject fake timers.
 */
/**
 * Creates a requestAnimationFrame-compatible function that safely falls back.
 *
 * @summary Prefer the native browser API, but gracefully degrade to timers
 * when unavailable so animations still execute in non-DOM environments.
 *
 * @pseudocode
 * 1. If `globalThis.requestAnimationFrame` exists, call it with `callback`.
 * 2. Otherwise call `globalThis.setTimeout(callback, 0)` to mimic RAF.
 *
 * @returns {function} A function matching the requestAnimationFrame signature.
 */
const createRequestAnimationFrame = () => {
  return (callback) => {
    if (typeof globalThis.requestAnimationFrame === "function") {
      return globalThis.requestAnimationFrame(callback);
    }
    return globalThis.setTimeout(callback, 0);
  };
};

/**
 * Creates a cancelAnimationFrame-compatible function that safely falls back.
 *
 * @summary Prefer the native browser API, but gracefully degrade to
 * `clearTimeout` when unavailable so timer-based fallbacks are cancelable.
 *
 * @pseudocode
 * 1. If `globalThis.cancelAnimationFrame` exists, call it with `handle`.
 * 2. Otherwise call `globalThis.clearTimeout(handle)`.
 *
 * @returns {function} A function matching the cancelAnimationFrame signature.
 */
const createCancelAnimationFrame = () => {
  return (handle) => {
    if (typeof globalThis.cancelAnimationFrame === "function") {
      return globalThis.cancelAnimationFrame(handle);
    }
    return globalThis.clearTimeout(handle);
  };
};

export const realScheduler = {
  setTimeout: (...args) => globalThis.setTimeout(...args),
  clearTimeout: (...args) => globalThis.clearTimeout(...args),
  requestAnimationFrame: createRequestAnimationFrame(),
  cancelAnimationFrame: createCancelAnimationFrame()
};

let currentScheduler = realScheduler;

// Keep realScheduler for any code that might still use it directly.
/**
 * A reference to the original, real scheduler (using `globalThis.setTimeout` and `globalThis.clearTimeout`).
 *
 * @summary This constant provides access to the browser's native timer functions,
 * even if a custom scheduler has been set via `setScheduler()`.
 *
 * @constant {object}
 * @pseudocode
 * 1. `realScheduler` is initialized with an object containing `setTimeout` and `clearTimeout` properties.
 * 2. These properties are bound to the global `setTimeout` and `clearTimeout` functions, ensuring they always refer to the native browser timers.
 */

/**
 * Retrieves the currently active scheduler.
 *
 * @summary This function provides access to the scheduler that is currently
 * being used for `setTimeout` and `clearTimeout` operations. This can be
 * the real browser scheduler or a custom one set for testing.
 *
 * @pseudocode
 * 1. Return the value of the module-scoped `currentScheduler` variable.
 *
 * @returns {object} The current scheduler object, containing `setTimeout` and `clearTimeout` methods.
 */
export function getScheduler() {
  return currentScheduler;
}

/**
 * Sets the active scheduler to a new custom scheduler.
 *
 * @summary This function allows for dependency injection of a custom scheduler,
 * which is particularly useful for testing environments (e.g., using fake timers).
 *
 * @pseudocode
 * 1. Validate `newScheduler`:
 *    a. If `newScheduler` is null/undefined or does not have a `setTimeout` method that is a function, throw an `Error` indicating an invalid scheduler.
 * 2. Assign `newScheduler` to the module-scoped `currentScheduler` variable, replacing the previous scheduler.
 *
 * @param {object} newScheduler - The new scheduler object, which must contain at least a `setTimeout` method.
 * @throws {Error} If an invalid scheduler object is provided.
 * @returns {void}
 */
export function setScheduler(newScheduler) {
  if (!newScheduler || typeof newScheduler.setTimeout !== "function") {
    throw new Error("Invalid scheduler object provided");
  }

  const schedulerWithFallback =
    typeof newScheduler.clearTimeout === "function"
      ? newScheduler
      : {
          ...newScheduler,
          clearTimeout: realScheduler.clearTimeout
        };

  currentScheduler = schedulerWithFallback;
}
