import { resetDispatchHistory } from "./eventDispatcher.js";
import { roundState } from "./roundState.js";

/**
 * @summary Track whether the current cooldown already dispatched the "ready" event.
 *
 * @pseudocode
 * 1. Use round state for all ready dispatch state tracking.
 * 2. Provide helpers that delegate to round state methods.
 */

/**
 * @summary Update the readiness dispatch flag for the active cooldown window.
 *
 * @pseudocode
 * 1. Delegate to roundState.markReadyDispatched() or resetReadyDispatch().
 *
 * @param {boolean} dispatched - Whether "ready" has already been dispatched.
 * @returns {void}
 */
export function setReadyDispatchedForCurrentCooldown(dispatched) {
  if (dispatched === true) {
    roundState.markReadyDispatched();
  } else {
    roundState.resetReadyDispatch();
  }
}

/**
 * @summary Determine if the current cooldown has already emitted "ready".
 *
 * @pseudocode
 * 1. Delegate to roundState.isReadyDispatched().
 *
 * @returns {boolean} True when "ready" dispatched for the current cooldown.
 */
export function hasReadyBeenDispatchedForCurrentCooldown() {
  return roundState.isReadyDispatched();
}

/**
 * @summary Reset the readiness dispatch tracking for the upcoming cooldown cycle.
 *
 * @pseudocode
 * 1. Delegate to roundState.resetReadyDispatch().
 * 2. Reset the shared event dispatcher history for the "ready" event.
 *
 * @returns {void}
 */
export function resetReadyDispatchState() {
  roundState.resetReadyDispatch();
  resetDispatchHistory("ready");
}
