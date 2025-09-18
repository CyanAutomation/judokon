/**
 * Shared debug state registry for developer-only toggles.
 *
 * @summary Maintain a small object on `globalThis` that remembers the last
 * requested state for debug-only UI toggles so we can service calls before the
 * DOM is available.
 */
const DEBUG_STATE_KEY = "__JUDOKON_DEBUG_STATE__";
const DEFAULT_STATE = {
  tooltipOverlayDebug: false,
  viewportSimulation: false
};

/**
 * Retrieve (or initialize) the debug state object stored on `globalThis`.
 *
 * @pseudocode
 * 1. Read `globalThis[DEBUG_STATE_KEY]`.
 * 2. If the value is not an object, clone `DEFAULT_STATE` and assign it to the
 *    global key so future calls reuse the same reference.
 * 3. Return the state object.
 *
 * @returns {Record<string, boolean>} Mutable state map keyed by debug flag.
 */
export function getDebugState() {
  const existing = globalThis[DEBUG_STATE_KEY];
  if (existing && typeof existing === "object") {
    return existing;
  }
  const initial = { ...DEFAULT_STATE };
  Object.defineProperty(globalThis, DEBUG_STATE_KEY, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: initial
  });
  return initial;
}

/**
 * Persist the desired state for a debug flag on the shared registry.
 *
 * @pseudocode
 * 1. Call `getDebugState()` to ensure the registry exists.
 * 2. Update `state[flag]` to `Boolean(enabled)`.
 * 3. Return the mutated state so callers can inspect it if desired.
 *
 * @param {string} flag - Debug flag identifier.
 * @param {boolean} enabled - Desired enabled state.
 * @returns {Record<string, boolean>} Updated shared state object.
 */
export function recordDebugState(flag, enabled) {
  const state = getDebugState();
  state[flag] = Boolean(enabled);
  return state;
}

/**
 * Reset the shared debug state to its defaults. Exposed primarily for tests.
 *
 * @pseudocode
 * 1. Delete the global registry when present.
 * 2. Return the freshly initialized state from `getDebugState()`.
 *
 * @returns {Record<string, boolean>} Fresh registry populated with defaults.
 */
export function resetDebugState() {
  try {
    // Allow deletion even if the property was never created.
    delete globalThis[DEBUG_STATE_KEY];
  } catch {}
  return getDebugState();
}
