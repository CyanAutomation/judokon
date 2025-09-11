/**
 * Barrel module for settings helpers and constants.
 *
 * Exposes a small, stable surface for importing commonly used settings
 * utilities. This file contains only re-exports and no runtime behavior.
 *
 * @pseudocode
 * 1. Re-export persistence helpers from `settingsStorage`.
 * 2. Re-export cache accessors from `settingsCache` for runtime lookups.
 * 3. Re-export `DEFAULT_SETTINGS` and `loadSettings` for app bootstrap.
 */

export {
  saveSettings,
  updateSetting,
  resetSettings,
  getSettingsSchema
} from "./settingsStorage.js";

/**
 * Retrieve a runtime setting value from the settings cache.
 *
 * @pseudocode
 * 1. Accept a string key corresponding to a setting name.
 * 2. Look up the key in the in-memory settings cache.
 * 3. If present, return the cached value.
 * 4. If not present, fall back to default settings and return the fallback value.
 *
 * @param {string} key - The settings key to retrieve.
 * @returns {*} The value for the requested setting or undefined if missing.
 */
// Re-exported from settingsCache.js
export { getSetting } from "./settingsCache.js";

/**
 * Query whether a named feature flag is enabled.
 *
 * @pseudocode
 * 1. Accept a feature flag key (string).
 * 2. Read the runtime feature-flag collection from the settings cache.
 * 3. Return a boolean indicating whether the flag is truthy/enabled.
 * 4. If the flag is missing, default to `false`.
 *
 * @param {string} flagKey - The feature flag identifier.
 * @returns {boolean} True when the flag is enabled, false otherwise.
 */
export { getFeatureFlag } from "./settingsCache.js";

/**
 * Load and return the default settings object used as a fallback.
 *
 * @pseudocode
 * 1. Read the default settings definition from the source of truth (defaults file).
 * 2. Return a shallow clone (or the object) so callers can read defaults safely.
 * 3. Do not mutate the returned object; callers should copy if they plan to change it.
 *
 * @returns {Object} The default settings object.
 */
export { loadDefaultSettings } from "./settingsCache.js";

/**
 * Re-export of the canonical default settings object used across the application.
 *
 * @summary This object defines the baseline configuration for all application
 * settings. It is used when user-specific settings are not found or are incomplete.
 *
 * @description
 * Consumers may read this object to seed UI defaults or for validation. Callers
 * who intend to mutate values should shallow-clone before modifying to avoid
 * unintended side effects on the global default.
 *
 * @type {Object}
 * @pseudocode
 * 1. The `DEFAULT_SETTINGS` object is imported from `../config/settingsDefaults.js`, which is considered the single source of truth for default configurations.
 * 2. This imported object is then re-exported under the same name, making it accessible to other modules that need to reference the application's default settings.
 */
export { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";

/**
 * Load persisted user settings from storage and merge with defaults.
 *
 * @pseudocode
 * 1. Read saved settings from persistence (localStorage / indexedDB / file).
 * 2. Merge the saved settings over `DEFAULT_SETTINGS` to produce the effective settings.
 * 3. Validate or sanitize incoming values as needed.
 * 4. Return the effective settings object.
 *
 * @returns {Promise<Object>|Object} The merged settings (may be async depending on implementation).
 */
export { loadSettings } from "../config/loadSettings.js";
