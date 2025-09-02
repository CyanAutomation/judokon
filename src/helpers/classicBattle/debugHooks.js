const debugState = {};

/**
 * Store a debug value for tests or diagnostics.
 *
 * @param {string} key - Unique key to store the debug value under.
 * @param {*} value - Any JSON-serializable or runtime value useful for tests.
 *
 * @pseudocode
 * 1. Assign `value` to the `debugState` map under `key`.
 * 2. This map is module-scoped and retained for the lifetime of the page
 *    or test worker.
 */
export function exposeDebugState(key, value) {
  debugState[key] = value;
}

/**
 * Read a debug value previously stored via `exposeDebugState`.
 *
 * @param {string} key - Key previously used in `exposeDebugState`.
 * @returns {*} The stored value or `undefined` when not present.
 *
 * @pseudocode
 * 1. Return the value associated with `key` from the `debugState` map.
 * 2. Do not throw; missing keys return `undefined` to make tests simpler.
 */
export function readDebugState(key) {
  return debugState[key];
}

export default { exposeDebugState, readDebugState };
