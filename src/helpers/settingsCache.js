import { DEFAULT_SETTINGS } from "./settingsSchema.js";

/**
 * Clone a settings object, duplicating nested structures to avoid mutations.
 *
 * @pseudocode
 * 1. Shallow copy `settings`.
 * 2. Clone nested objects: `tooltipIds`, `gameModes`, and `featureFlags`.
 * 3. Return the cloned object.
 *
 * @param {import("./settingsSchema.js").Settings} settings - Settings to clone.
 * @returns {import("./settingsSchema.js").Settings} Cloned settings.
 */
function cloneSettings(settings) {
  return {
    ...settings,
    tooltipIds: settings.tooltipIds ? { ...settings.tooltipIds } : undefined,
    gameModes: settings.gameModes ? { ...settings.gameModes } : undefined,
    featureFlags: settings.featureFlags
      ? Object.fromEntries(
          Object.entries(settings.featureFlags).map(([name, flag]) => [name, { ...flag }])
        )
      : undefined
  };
}

// Cached settings object for synchronous access
let cachedSettings = cloneSettings(DEFAULT_SETTINGS);

/**
 * Replace the cached settings object.
 *
 * @pseudocode
 * 1. Clone `settings` to prevent external mutations.
 * 2. Assign the clone to `cachedSettings`.
 *
 * @param {import("./settingsSchema.js").Settings} settings - New settings object.
 */
export function setCachedSettings(settings) {
  cachedSettings = cloneSettings(settings);
}

/**
 * Reset the cache to the default settings.
 *
 * @pseudocode
 * 1. Set `cachedSettings` to a cloned copy of `DEFAULT_SETTINGS`.
 */
export function resetCache() {
  cachedSettings = cloneSettings(DEFAULT_SETTINGS);
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
