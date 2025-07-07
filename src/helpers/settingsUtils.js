import { validateWithSchema } from "./dataUtils.js";
const settingsSchema = await import("../schemas/settings.schema.json", {
  assert: { type: "json" }
}).then((module) => module.default);

const SETTINGS_KEY = "settings";
const DEFAULT_SETTINGS = {
  sound: true,
  fullNavMap: true,
  motionEffects: true,
  displayMode: "light",
  gameModes: {}
};
export { DEFAULT_SETTINGS };

let saveTimer;
const SAVE_DELAY_MS = 100;

/**
 * Load persisted settings from localStorage.
 *
 * @pseudocode
 * 1. Throw an error if `localStorage` is unavailable.
 * 2. Retrieve the JSON string stored under `SETTINGS_KEY`.
 *    - When no value exists, return `DEFAULT_SETTINGS`.
 * 3. Parse the JSON and merge with `DEFAULT_SETTINGS`.
 * 4. Validate the merged object with `settingsSchema`.
 * 5. Return the validated settings or throw on failure.
 *
 * @returns {Promise<Settings>} Resolved settings object.
 */
export async function loadSettings() {
  try {
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage unavailable");
    }
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    await validateWithSchema(merged, settingsSchema);
    return merged;
  } catch (error) {
    throw error;
  }
}

/**
 * Persist settings to localStorage using a debounce.
 *
 * @pseudocode
 * 1. Clear any existing debounce timer.
 * 2. Start a new timer that writes the settings after `SAVE_DELAY_MS`.
 *    - Serialize `settings` with `JSON.stringify`.
 *    - Call `localStorage.setItem` with the result.
 * 3. Resolve the promise on success, reject if an error occurs.
 *
 * @param {Settings} settings - Settings object to save.
 * @returns {Promise<void>} Resolves when the write completes.
 */
export function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    if (typeof localStorage === "undefined") {
      reject(new Error("localStorage unavailable"));
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        resolve();
      } catch (err) {
        console.error("Failed to save settings:", err);
        reject(err);
      }
    }, SAVE_DELAY_MS);
  });
}

/**
 * Update a single setting and persist the result.
 *
 * @pseudocode
 * 1. Call `loadSettings` to obtain current settings.
 * 2. Merge the provided `key`/`value` into the settings object.
 * 3. Validate the updated object with `settingsSchema`.
 * 4. Persist the object using `saveSettings`.
 * 5. Return the updated settings.
 *
 * @param {string} key - Name of the setting to update.
 * @param {*} value - Value to assign to the setting.
 * @returns {Promise<Settings>} Updated settings object.
 */
export async function updateSetting(key, value) {
  try {
    const current = await loadSettings();
    const updated = { ...current, [key]: value };
    await validateWithSchema(updated, settingsSchema);
    await saveSettings(updated);
    return updated;
  } catch (error) {
    console.error(`Failed to update setting ${key}:`, error);
    throw error;
  }
}

/**
 * @typedef {Object} Settings
 * @property {boolean} sound
 * @property {boolean} fullNavMap
 * @property {boolean} motionEffects
 * @property {"light"|"dark"|"gray"} displayMode
 * @property {Record<string, boolean>} [gameModes]
 */
