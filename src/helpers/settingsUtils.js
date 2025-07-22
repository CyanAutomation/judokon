import { validateWithSchema } from "./dataUtils.js";

/**
 * The settings JSON schema is loaded only when required to validate data.
 * This keeps module initialization lightweight in all environments.
 */
let settingsSchemaPromise;

async function getSettingsSchema() {
  if (!settingsSchemaPromise) {
    settingsSchemaPromise = fetch(new URL("../schemas/settings.schema.json", import.meta.url))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch settings schema: ${response.status} ${response.statusText}`
          );
        }
        return response.json();
      })
      .catch(
        async () =>
          (await import("../schemas/settings.schema.json", { assert: { type: "json" } })).default
      );
  }
  return settingsSchemaPromise;
}

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
 * 1. Call `getSettingsSchema()` to lazily load the schema.
 * 2. Throw an error if `localStorage` is unavailable.
 * 3. Retrieve the JSON string stored under `SETTINGS_KEY`.
 *    - When no value exists, return `DEFAULT_SETTINGS`.
 * 4. Parse the JSON and merge with `DEFAULT_SETTINGS`.
 * 5. Validate the merged object with `settingsSchema`.
 * 6. Return the validated settings or throw on failure.
 *
 * @returns {Promise<Settings>} Resolved settings object.
 */
export async function loadSettings() {
  try {
    await getSettingsSchema();
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage unavailable");
    }
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    await validateWithSchema(merged, await getSettingsSchema());
    return merged;
  } catch (error) {
    // For PRD: show error popup in UI, not here
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
        // For PRD: error popup handled in UI
        reject(err);
      }
    }, SAVE_DELAY_MS);
  });
}

/**
 * Update a single setting and persist the result.
 *
 * @pseudocode
 * 1. Call `getSettingsSchema()` to lazily load the schema.
 * 2. Call `loadSettings` to obtain current settings.
 * 3. Merge the provided `key`/`value` into the settings object.
 * 4. Validate the updated object with `settingsSchema`.
 * 5. Persist the object using `saveSettings`.
 * 6. Return the updated settings.
 *
 * @param {string} key - Name of the setting to update.
 * @param {*} value - Value to assign to the setting.
 * @returns {Promise<Settings>} Updated settings object.
 */
export async function updateSetting(key, value) {
  try {
    await getSettingsSchema();
    const current = await loadSettings();
    const updated = { ...current, [key]: value };
    await validateWithSchema(updated, await getSettingsSchema());
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } else {
      await saveSettings(updated);
    }
    return updated;
  } catch (error) {
    // For PRD: error popup handled in UI
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
