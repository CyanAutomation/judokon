import { FEATURE_FLAG_REGISTRY } from "../../config/featureFlagRegistry.js";

/**
 * Merge current feature flags with defaults.
 *
 * @pseudocode
 * 1. Merge `FEATURE_FLAG_REGISTRY` with `currentSettings.featureFlags`.
 * 2. Update `currentSettings.featureFlags` with the merged map.
 * 3. Return the merged feature flag map.
 *
 * @param {Settings} currentSettings - Mutable settings object.
 * @returns {object} Synced feature flag map.
 */
export function syncFeatureFlags(currentSettings) {
  const flags = {
    ...FEATURE_FLAG_REGISTRY,
    ...(currentSettings.featureFlags || {})
  };
  currentSettings.featureFlags = flags;
  return flags;
}
