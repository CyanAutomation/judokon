import { validateWithSchema, importJsonModule } from "./dataUtils.js";

/**
 * The settings JSON schema is loaded only when required to validate data.
 * This keeps module initialization lightweight in all environments.
 */
let settingsSchemaPromise;

async function getSettingsSchema() {
  if (!settingsSchemaPromise) {
    settingsSchemaPromise = (async () => {
      const base = typeof import.meta.url === "string" ? import.meta.url : undefined;
      try {
        const url = new URL("../schemas/settings.schema.json", base);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch settings schema: ${response.status} ${response.statusText}`
          );
        }
        return await response.json();
      } catch {
        return importJsonModule("../schemas/settings.schema.json");
      }
    })();
  }
  return settingsSchemaPromise;
}

const SETTINGS_KEY = "settings";
export let DEFAULT_SETTINGS = {};

let defaultSettingsPromise;

/**
 * Load the default settings from disk.
 *
 * @returns {Promise<Settings>} Resolved default settings object.
 */
export async function loadDefaultSettings() {
  if (!defaultSettingsPromise) {
    defaultSettingsPromise = (async () => {
      const base = typeof import.meta.url === "string" ? import.meta.url : import.meta.url?.href;
      try {
        const url = new URL("../data/settings.json", base);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch default settings: ${response.status} ${response.statusText}`
          );
        }
        return await response.json();
      } catch {
        return importJsonModule("../data/settings.json");
      }
    })();
  }
  const data = await defaultSettingsPromise;
  if (Object.keys(DEFAULT_SETTINGS).length === 0) {
    DEFAULT_SETTINGS = data;
  }
  return { ...data };
}

let saveTimer;
const SAVE_DELAY_MS = 100;

/**
 * Load persisted settings from localStorage.
 *
 * @pseudocode
 * 1. Call `getSettingsSchema()` to lazily load the schema.
 * 2. Ensure defaults are loaded by invoking `loadDefaultSettings` when `DEFAULT_SETTINGS` is empty.
 * 3. Throw an error if `localStorage` is unavailable.
 * 4. Retrieve the JSON string stored under `SETTINGS_KEY`.
 *    - When no value exists, return `DEFAULT_SETTINGS`.
 * 5. Parse the JSON and merge with `DEFAULT_SETTINGS`.
 * 6. Validate the merged object with `settingsSchema`.
 * 7. Return the validated settings or throw on failure.
 *
 * @returns {Promise<Settings>} Resolved settings object.
 */
export async function loadSettings() {
  await getSettingsSchema();
  if (!Object.keys(DEFAULT_SETTINGS).length) {
    await loadDefaultSettings();
  }
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    await validateWithSchema(merged, await getSettingsSchema());
    return merged;
  } catch (error) {
    console.warn("Invalid stored settings, resetting to defaults", error);
    localStorage.removeItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS };
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
 * Reset all settings to their default values.
 *
 * @pseudocode
 * 1. Overwrite the `SETTINGS_KEY` entry in `localStorage` with `DEFAULT_SETTINGS`.
 * 2. Ignore errors if `localStorage` is unavailable or write fails.
 * 3. Return a new copy of `DEFAULT_SETTINGS`.
 *
 * @returns {Settings} The default settings object.
 */
export function resetSettings() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }
  } catch (err) {
    // For PRD: error popup handled in UI
    console.error("Failed to reset settings", err);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * @typedef {Object} Settings
 * @property {boolean} sound
 * @property {boolean} motionEffects
 * @property {boolean} typewriterEffect
 * @property {boolean} tooltips
 * @property {boolean} showCardOfTheDay
 * @property {"light"|"dark"|"high-contrast"} displayMode
 * @property {boolean} fullNavigationMap
 * @property {Record<string, string>} [tooltipIds]
 * @property {Record<string, boolean>} [gameModes]
 * @property {Record<string, {
 *   enabled: boolean,
 *   tooltipId?: string
 * }>} [featureFlags]
 */

await loadDefaultSettings();
