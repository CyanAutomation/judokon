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

export { getSetting, getFeatureFlag, loadDefaultSettings } from "./settingsCache.js";

export { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";

export { loadSettings } from "../config/loadSettings.js";
