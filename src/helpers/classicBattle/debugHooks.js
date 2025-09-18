/**
 * Store a debug value for tests or diagnostics.
 *
 * @param {string} key - Unique key to store the debug value under.
 * @param {*} value - Any JSON-serializable or runtime value useful for tests.
 *
 * @pseudocode
 * 1. Take a `key` and a `value`.
 * 2. Store the `value` in the global debug map using the `key`.
 * @returns {void}
 */
export function exposeDebugState(key, value) {
  if (typeof window !== "undefined") {
    if (!window.__classicBattleDebugMap) {
      window.__classicBattleDebugMap = new Map();
    }
    window.__classicBattleDebugMap.set(key, value);
    window.__debugExposed = true;
  }
}

/**
 * Read a debug value previously stored via `exposeDebugState`.
 *
 * @param {string} key - Key previously used in `exposeDebugState`.
 * @returns {*} The stored value or `undefined` when not present.
 *
 * @pseudocode
 * 1. Return the value associated with `key` from the global debug map.
 * 2. Do not throw; missing keys return `undefined` to make tests simpler.
 */
export function readDebugState(key) {
  if (typeof window !== "undefined" && window.__classicBattleDebugMap) {
    return window.__classicBattleDebugMap.get(key);
  }
  return undefined;
}

// Expose hooks on global for modules that cannot reliably share ESM bindings in tests.
try {
  if (typeof window !== "undefined") {
    window.__classicBattleDebugExpose = exposeDebugState;
    window.__classicBattleDebugRead = readDebugState;
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
