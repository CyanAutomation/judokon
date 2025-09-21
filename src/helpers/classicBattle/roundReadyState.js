import { resetDispatchHistory } from "./eventDispatcher.js";
import { roundStore } from "./roundStore.js";

/**
 * @summary Track whether the current cooldown already dispatched the "ready" event.
 *
 * @pseudocode
 * 1. Use RoundStore for all ready dispatch state tracking.
 * 2. Provide helpers that delegate to RoundStore methods.
 */

/**
 * @summary Update the readiness dispatch flag for the active cooldown window.
 *
 * @pseudocode
 * 1. Delegate to RoundStore.markReadyDispatched() or resetReadyDispatch().
 *
 * @param {boolean} dispatched - Whether "ready" has already been dispatched.
 * @returns {void}
 */
export function setReadyDispatchedForCurrentCooldown(dispatched) {
  if (dispatched === true) {
    roundStore.markReadyDispatched();
  } else {
    roundStore.resetReadyDispatch();
  }
}

/**
 * @summary Determine if the current cooldown has already emitted "ready".
 *
 * @pseudocode
 * 1. Delegate to RoundStore.isReadyDispatched().
 *
 * @returns {boolean} True when "ready" dispatched for the current cooldown.
 */
export function hasReadyBeenDispatchedForCurrentCooldown() {
  return roundStore.isReadyDispatched();
}

/**
 * @summary Reset the readiness dispatch tracking for the upcoming cooldown cycle.
 *
 * @pseudocode
 * 1. Delegate to RoundStore.resetReadyDispatch().
 * 2. Reset the shared event dispatcher history for the "ready" event.
 *
 * @returns {void}
 */
export function resetReadyDispatchState() {
  roundStore.resetReadyDispatch();
  resetDispatchHistory("ready");
}
