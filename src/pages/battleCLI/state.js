/**
 * Shared state for the Battle CLI page.
 *
 * @pseudocode
 * state = {...initial values}
 * export state object
 * export helpers for escape promise
 */
const state = {
  ignoreNextAdvanceClick: false,
  roundResolving: false,
  shortcutsReturnFocus: null,
  shortcutsOverlay: null,
  escapeHandledResolve: undefined,
  escapeHandledPromise: null
};

state.escapeHandledPromise = new Promise((r) => {
  state.escapeHandledResolve = r;
});

export default state;

/**
 * Retrieve a promise that resolves after the Escape key is handled.
 *
 * @pseudocode
 * return state.escapeHandledPromise
 *
 * @returns {Promise<void>} promise resolved when Escape handled
 */
export function getEscapeHandledPromise() {
  return state.escapeHandledPromise;
}

/**
 * Resolve any pending Escape promise and create a new one.
 *
 * @pseudocode
 * call current resolver if present
 * replace escapeHandledPromise with new Promise and store resolver
 */
export function resolveEscapeHandled() {
  try {
    state.escapeHandledResolve?.();
  } catch {}
  state.escapeHandledPromise = new Promise((r) => {
    state.escapeHandledResolve = r;
  });
}
