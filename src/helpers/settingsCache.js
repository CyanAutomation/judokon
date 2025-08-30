import { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";
import { loadSettings } from "../config/loadSettings.js";

/**
 * Clone a settings object, duplicating nested structures to avoid mutations.
 *
 * @pseudocode
 * 1. Shallow copy `settings`.
 * 2. Clone nested objects: `tooltipIds`, `gameModes`, and `featureFlags`.
 * 3. Return the cloned object.
 *
 * @param {import("../config/settingsDefaults.js").Settings} settings - Settings to clone.
 * @returns {import("../config/settingsDefaults.js").Settings} Cloned settings.
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

let cachedSettings = cloneSettings(DEFAULT_SETTINGS);

/**
 * Load settings into the in-memory cache, falling back to defaults on error.
 *
 * @pseudocode
 * 1. Attempt to load settings via `loadSettings()`.
 *    - `loadSettings` may fetch JSON and fall back to `importJsonModule` internally.
 * 2. On success, cache a cloned copy with `setCachedSettings`.
 * 3. Return the cached settings.
 * 4. If any step fails, return the existing `cachedSettings` defaults.
 *
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Cached settings.
 */
export async function loadDefaultSettings() {
  try {
    const settings = await loadSettings();
    setCachedSettings(settings);
    return settings;
  } catch {
    return cachedSettings;
  }
}

/**
 * Replace the cached settings object.
 *
 * @pseudocode
 * 1. Clone `settings` to prevent external mutations.
 * 2. Assign the clone to `cachedSettings`.
 *
 * @param {import("../config/settingsDefaults.js").Settings} settings - New settings object.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
 * @param {keyof import("../config/settingsDefaults.js").Settings} key - The setting key to read.
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
 * @returns {import("../config/settingsDefaults.js").Settings} Cached settings.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function getCachedSettings() {
  return cachedSettings;
}
