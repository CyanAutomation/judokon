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
 * Replaces the current in-memory cached settings object with a new one.
 *
 * @summary This function is crucial for updating the application's runtime
 * configuration, ensuring that all parts of the application access the most
 * current settings.
 *
 * @pseudocode
 * 1. Call `cloneSettings(settings)` to create a deep copy of the provided `settings` object. This prevents external modifications to the original `settings` object from inadvertently affecting the cached state.
 * 2. Assign the newly cloned settings object to the module-scoped `cachedSettings` variable.
 * 3. Subsequent calls to `getCachedSettings()` or `getSetting()` will now return values from this updated cache.
 *
 * @param {import("../config/settingsDefaults.js").Settings} settings - The new settings object to be cached.
 * @returns {void}
 */
export function setCachedSettings(settings) {
  cachedSettings = cloneSettings(settings);
}

/**
 * Resets the in-memory settings cache to the application's canonical default settings.
 *
 * @summary This function is typically used to restore all settings to their
 * factory defaults, discarding any user-specific or persisted configurations.
 *
 * @pseudocode
 * 1. Call `cloneSettings(DEFAULT_SETTINGS)` to create a fresh, deep copy of the `DEFAULT_SETTINGS` object. This ensures that the `cachedSettings` is reset to a pristine state and is not a direct reference to `DEFAULT_SETTINGS` (preventing accidental mutation of the defaults).
 * 2. Assign this cloned default settings object to the module-scoped `cachedSettings` variable.
 * 3. Subsequent calls to retrieve settings will now reflect these default values until new settings are loaded or set.
 *
 * @returns {void}
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
 * @pseudocode
 * 1. Return a reference to the in-memory `cachedSettings` used by runtime lookups.
 * 2. Consumers should not mutate this object directly; clone if mutation is needed.
 *
 * @returns {import("../config/settingsDefaults.js").Settings} Cached settings.
 */
export function getCachedSettings() {
  return cachedSettings;
}
