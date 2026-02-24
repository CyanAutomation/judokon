import { DEFAULT_SETTINGS } from "./settingsDefaults.js";

/**
 * Canonical feature-flag registry derived from `src/data/settings.json` defaults.
 * All consumers should validate keys against this map.
 */
export const FEATURE_FLAG_REGISTRY = Object.freeze({ ...DEFAULT_SETTINGS.featureFlags });

/**
 * Determine whether a flag is registered in the canonical registry.
 *
 * @pseudocode
 * 1. Verify `flag` is a string.
 * 2. Return whether the registry has an own property with that flag name.
 *
 * @param {string} flag
 * @returns {boolean}
 */
export function isRegisteredFeatureFlag(flag) {
  return typeof flag === "string" && Object.hasOwn(FEATURE_FLAG_REGISTRY, flag);
}

/**
 * Throw if a feature flag is not present in the canonical registry.
 *
 * @pseudocode
 * 1. Reuse `isRegisteredFeatureFlag` to check membership.
 * 2. Throw an Error including the caller name and unknown flag when missing.
 * 3. Return normally when the flag is known.
 *
 * @param {string} flag
 * @param {string} caller
 * @returns {void}
 */
export function assertRegisteredFeatureFlag(flag, caller) {
  if (!isRegisteredFeatureFlag(flag)) {
    throw new Error(`[featureFlags] ${caller} received unknown flag: ${String(flag)}`);
  }
}
