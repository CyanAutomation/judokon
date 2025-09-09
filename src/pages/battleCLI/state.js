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
 * @description
 * Callers awaiting Escape handling may use this promise to know when the
 * UI has processed an Escape press. The promise is re-created each time
 * `resolveEscapeHandled` is called so multiple cycles can be awaited.
 *
 * @pseudocode
 * 1. Return the current `state.escapeHandledPromise`.
 *
 * @returns {Promise<void>} promise resolved when Escape handled
 */
export function getEscapeHandledPromise() {
  return state.escapeHandledPromise;
}

/**
 * Resolve the pending Escape-handled promise and create a fresh one.
 *
 * @description
 * When Escape is processed, call this to resolve any waiter and reset the
 * internal promise so future Escape events can be awaited independently.
 *
 * @pseudocode
 * 1. If a resolver exists, call it to resolve the current promise.
 * 2. Create a new Promise and store its resolver on `state` for the next cycle.
 */
/**
 * Resolve the pending Escape-handled promise and create a fresh one.
 *
 * @description
 * When Escape is processed, call this to resolve any waiter and reset the
 * internal promise so future Escape events can be awaited independently.
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. If a resolver exists, call it to resolve the current promise.
 * 2. Create a new Promise and store its resolver on `state` for the next cycle.
 */
export function resolveEscapeHandled() {
  try {
    state.escapeHandledResolve?.();
  } catch {}
  state.escapeHandledPromise = new Promise((r) => {
    state.escapeHandledResolve = r;
  });
}
