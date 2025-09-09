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

// Expose hooks on global for modules that cannot reliably share ESM bindings in tests.
try {
  if (typeof globalThis !== "undefined") {
    globalThis.__classicBattleDebugExpose = exposeDebugState;
    globalThis.__classicBattleDebugRead = readDebugState;
  }
} catch {}

export default { exposeDebugState, readDebugState };

/**
 * @summary Debug state helpers used by the orchestrator and tests.
 *
 * These functions provide a simple in-memory map for storing diagnostic
 * values (timestamps, cancel functions, debug flags) that are useful when
 * tests or UI components cannot share module bindings directly.
 *
 * @pseudocode
 * 1. `exposeDebugState(key, value)` stores `value` under `key` in a module map.
 * 2. `readDebugState(key)` returns the stored value or `undefined`.
 * 3. Also export the helpers as properties on `globalThis` to support
 *    cross-worker or global test access when necessary.
 */
