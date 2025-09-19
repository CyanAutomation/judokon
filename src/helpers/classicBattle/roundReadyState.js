/**
 * @summary Track whether the current cooldown already dispatched the "ready" event.
 *
 * @pseudocode
 * 1. Store a module-level flag describing the readiness dispatch state.
 * 2. Provide helpers to mutate and read the flag for collaborating modules.
 */
let readyDispatchedForCurrentCooldown = false;

/**
 * @summary Update the readiness dispatch flag for the active cooldown window.
 *
 * @pseudocode
 * 1. Coerce the provided value to a strict boolean.
 * 2. Persist the result on the module-level flag.
 *
 * @param {boolean} dispatched - Whether "ready" has already been dispatched.
 * @returns {void}
 */
export function setReadyDispatchedForCurrentCooldown(dispatched) {
  readyDispatchedForCurrentCooldown = dispatched === true;
}

/**
 * @summary Determine if the current cooldown has already emitted "ready".
 *
 * @pseudocode
 * 1. Return the module-level readiness flag as a boolean.
 *
 * @returns {boolean} True when "ready" dispatched for the current cooldown.
 */
export function hasReadyBeenDispatchedForCurrentCooldown() {
  return readyDispatchedForCurrentCooldown === true;
}
