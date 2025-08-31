const debugState = {};

/**
 * Store a debug value for tests or diagnostics.
 *
 * @param {string} key
 * @param {*} value
 */
export function exposeDebugState(key, value) {
  debugState[key] = value;
}

/**
 * Read a debug value previously stored via `exposeDebugState`.
 *
 * @param {string} key
 * @returns {*}
 */
export function readDebugState(key) {
  return debugState[key];
}

export default { exposeDebugState, readDebugState };
