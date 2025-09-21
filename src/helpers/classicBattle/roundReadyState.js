import { resetDispatchHistory } from "./eventDispatcher.js";
import { roundStore } from "./roundStore.js";
import { isEnabled } from "../featureFlags.js";

/**
 * @summary Track whether the current cooldown already dispatched the "ready" event.
 *
 * @pseudocode
 * 1. Use RoundStore when feature flag is enabled, otherwise fall back to module-level flag.
 * 2. Provide helpers to mutate and read the flag for collaborating modules.
 */
let readyDispatchedForCurrentCooldown = false;

/**
 * @summary Update the readiness dispatch flag for the active cooldown window.
 *
 * @pseudocode
 * 1. If RoundStore is enabled, delegate to RoundStore.markReadyDispatched().
 * 2. Otherwise, coerce the provided value to a strict boolean and persist on module-level flag.
 *
 * @param {boolean} dispatched - Whether "ready" has already been dispatched.
 * @returns {void}
 */
export function setReadyDispatchedForCurrentCooldown(dispatched) {
  if (isEnabled("roundStore")) {
    if (dispatched === true) {
      roundStore.markReadyDispatched();
    } else {
      roundStore.resetReadyDispatch();
    }
  } else {
    readyDispatchedForCurrentCooldown = dispatched === true;
  }
}

/**
 * @summary Determine if the current cooldown has already emitted "ready".
 *
 * @pseudocode
 * 1. If RoundStore is enabled, delegate to RoundStore.isReadyDispatched().
 * 2. Otherwise, return the module-level readiness flag as a boolean.
 *
 * @returns {boolean} True when "ready" dispatched for the current cooldown.
 */
export function hasReadyBeenDispatchedForCurrentCooldown() {
  if (isEnabled("roundStore")) {
    return roundStore.isReadyDispatched();
  } else {
    return readyDispatchedForCurrentCooldown === true;
  }
}

/**
 * @summary Reset the readiness dispatch tracking for the upcoming cooldown cycle.
 *
 * @pseudocode
 * 1. If RoundStore is enabled, delegate to RoundStore.resetReadyDispatch().
 * 2. Otherwise, clear the module-level readiness flag and reset event dispatcher history.
 *
 * @returns {void}
 */
export function resetReadyDispatchState() {
  if (isEnabled("roundStore")) {
    roundStore.resetReadyDispatch();
  } else {
    setReadyDispatchedForCurrentCooldown(false);
  }
  resetDispatchHistory("ready");
}
