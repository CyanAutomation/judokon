/**
 * Wire pre-match view interactions required before round-start policy executes.
 *
 * @param {object} options
 * @param {object} options.store
 * @param {(store: object) => void} options.wireStatBindings
 * @returns {void}
 * @pseudocode
 * 1. Invoke the supplied stat-binding callback with the prepared store.
 */
export function runPreMatchViewWiringPhase({ store, wireStatBindings }) {
  wireStatBindings(store);
}

/**
 * Wire post-match view interactions that must run after match-start DOM replacement.
 *
 * @param {object} options
 * @param {object} options.store
 * @param {(store: object) => void} options.wireControlBindings
 * @returns {void}
 * @pseudocode
 * 1. Invoke the supplied control-binding callback with the prepared store.
 */
export function runPostMatchViewWiringPhase({ store, wireControlBindings }) {
  wireControlBindings(store);
}
