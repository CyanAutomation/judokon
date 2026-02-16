import { isEnabled } from "../featureFlags.js";

/**
 * Resolve whether the optional opponent delay UX should be active.
 *
 * @pseudocode
 * 1. If the resolver is not a function, coerce the value to boolean.
 * 2. Otherwise read the `opponentDelayMessage` flag from the resolver.
 * 3. Return true only for an explicit enabled value.
 * @param {(flag: string) => boolean} [isFeatureEnabled=isEnabled] - Feature flag resolver.
 * @returns {boolean} True when opponent delay UX is enabled.
 */
export function isOpponentDelayUxEnabled(isFeatureEnabled = isEnabled) {
  if (typeof isFeatureEnabled !== "function") {
    return Boolean(isFeatureEnabled);
  }
  return isFeatureEnabled("opponentDelayMessage") === true;
}

/**
 * Resolve whether timeout should trigger optional auto-select UX helpers.
 *
 * @pseudocode
 * 1. If the resolver is not a function, coerce the value to boolean.
 * 2. Otherwise read the `autoSelect` flag from the resolver.
 * 3. Return true only for an explicit enabled value.
 * @param {(flag: string) => boolean} [isFeatureEnabled=isEnabled] - Feature flag resolver.
 * @returns {boolean} True when auto-select UX intent should be emitted.
 */
export function isAutoSelectUxEnabled(isFeatureEnabled = isEnabled) {
  if (typeof isFeatureEnabled !== "function") {
    return Boolean(isFeatureEnabled);
  }
  return isFeatureEnabled("autoSelect") === true;
}
