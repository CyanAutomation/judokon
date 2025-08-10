import { DEFAULT_SETTINGS } from "./settingsSchema.js";

// Cached settings object for synchronous access
let cachedSettings = { ...DEFAULT_SETTINGS };

/**
 * Replace the cached settings object.
 *
 * @pseudocode
 * 1. Assign `settings` to `cachedSettings`.
 *
 * @param {import("./settingsSchema.js").Settings} settings - New settings object.
 */
export function setCachedSettings(settings) {
  cachedSettings = settings;
}

/**
 * Reset the cache to the default settings.
 *
 * @pseudocode
 * 1. Set `cachedSettings` to a shallow copy of `DEFAULT_SETTINGS`.
 */
export function resetCache() {
  cachedSettings = { ...DEFAULT_SETTINGS };
}

/**
 * Retrieve a setting value synchronously from the cached settings.
 *
 * @pseudocode
 * 1. Return `cachedSettings[key]`.
 *
 * @param {keyof import("./settingsSchema.js").Settings} key - The setting key to read.
 * @returns {*} Setting value.
 */
export function getSetting(key) {
  return cachedSettings[key];
}

/**
 * Retrieve a feature flag's enabled state.
 *
 * @pseudocode
 * 1. Access `cachedSettings.featureFlags?.[flagName]?.enabled`.
 * 2. Return `false` when no flag exists.
 *
 * @param {string} flagName - Name of the feature flag.
 * @returns {boolean} True when the flag is enabled.
 */
export function getFeatureFlag(flagName) {
  return cachedSettings.featureFlags?.[flagName]?.enabled ?? false;
}

/**
 * Access the entire cached settings object.
 *
 * @returns {import("./settingsSchema.js").Settings} Cached settings.
 */
export function getCachedSettings() {
  return cachedSettings;
}
