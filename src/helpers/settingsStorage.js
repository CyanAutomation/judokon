import { validateWithSchema } from "./dataUtils.js";
import { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";
import { loadSettings as baseLoadSettings } from "../config/loadSettings.js";
import { setCachedSettings } from "./settingsCache.js";
import settingsSchema from "../schemas/settings.schema.json" with { type: "json" };

const SETTINGS_KEY = "settings";

/**
 * Persist settings to localStorage with schema validation.
 *
 * @pseudocode
 * 1. Validate the incoming settings against the JSON schema.
 * 2. If `localStorage` is unavailable, update the cache and reject.
 * 3. Otherwise write the JSON string to storage.
 * 4. Update the in-memory cache and resolve.
 *
 * @param {import("../config/settingsDefaults.js").Settings} settings - Settings object to save.
 * @returns {Promise<void>} Resolves after persistence; rejects if storage is unavailable or invalid.
 */
export async function saveSettings(settings) {
  await validateWithSchema(settings, settingsSchema);

  if (typeof localStorage === "undefined") {
    setCachedSettings(settings);
    throw new Error("localStorage unavailable");
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    throw new Error(`Failed to save settings: ${error.message}`);
  }
  setCachedSettings(settings);
}

/**
 * Load persisted settings from localStorage with schema validation.
 *
 * @pseudocode
 * 1. Throw if `localStorage` is unavailable.
 * 2. Load settings via the base loader (defaults + runtime JSON + storage overrides).
 * 3. Validate the merged settings against the JSON schema.
 * 4. Cache and return the valid settings.
 * 5. On error, clear storage, cache defaults, and return defaults.
 *
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Resolved settings object.
 */
export async function loadSettings() {
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      JSON.parse(raw);
    }
    const settings = await baseLoadSettings();
    await validateWithSchema(settings, settingsSchema);
    setCachedSettings(settings);
    return settings;
  } catch (error) {
    console.debug("Invalid stored settings, resetting to defaults", error);
    localStorage.removeItem(SETTINGS_KEY);
    const copy = structuredClone(DEFAULT_SETTINGS);
    setCachedSettings(copy);
    return copy;
  }
}
