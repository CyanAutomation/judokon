import { DEFAULT_SETTINGS } from "../../config/settingsDefaults.js";

/**
 * Merge current feature flags with defaults.
 *
 * @pseudocode
 * 1. Merge `DEFAULT_SETTINGS.featureFlags` with `currentSettings.featureFlags`.
 * 2. Update `currentSettings.featureFlags` with the merged map.
 * 3. Return the merged feature flag map.
 *
 * @param {Settings} currentSettings - Mutable settings object.
 * @returns {object} Synced feature flag map.
 */
export function syncFeatureFlags(currentSettings) {
  const flags = {
    ...DEFAULT_SETTINGS.featureFlags,
    ...(currentSettings.featureFlags || {})
  };
  currentSettings.featureFlags = flags;
  return flags;
}
