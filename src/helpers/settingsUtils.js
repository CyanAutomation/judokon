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
  return { ...data };
}

/**
 * Default settings object preloaded during module initialization.
 *
 * Ready for immediate use after import.
 *
 * @type {Settings}
 */
export const DEFAULT_SETTINGS = await loadDefaultSettings();

let saveTimer;
const SAVE_DELAY_MS = 100;

// Cached settings object for synchronous access
let cachedSettings = { ...DEFAULT_SETTINGS };

/**
 * Load persisted settings from localStorage.
 *
 * @pseudocode
 * 1. Call `getSettingsSchema()` to lazily load the schema.
 * 2. Throw an error if `localStorage` is unavailable.
 * 3. Retrieve the JSON string stored under `SETTINGS_KEY`.
 *    - When no value exists, return `DEFAULT_SETTINGS`.
 * 4. Parse the JSON and deep merge nested objects with `DEFAULT_SETTINGS`.
 * 5. Validate the merged object with `settingsSchema`.
 * 6. Return the validated settings or throw on failure.
 *
 * @returns {Promise<Settings>} Resolved settings object.
 */
export async function loadSettings() {
  await getSettingsSchema();
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
  try {
    const parsed = JSON.parse(raw);
    const merged = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      featureFlags: {
        ...DEFAULT_SETTINGS.featureFlags,
        ...parsed.featureFlags
      },
      gameModes: {
        ...DEFAULT_SETTINGS.gameModes,
        ...parsed.gameModes
      },
      tooltipIds: {
        ...DEFAULT_SETTINGS.tooltipIds,
        ...parsed.tooltipIds
      }
    };
    await validateWithSchema(merged, await getSettingsSchema());
    cachedSettings = merged;
    return merged;
  } catch (error) {
    console.debug("Invalid stored settings, resetting to defaults", error);
    localStorage.removeItem(SETTINGS_KEY);
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
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
    cachedSettings = updated;
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
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

/**
 * Retrieve a setting value synchronously from the cached settings.
 *
 * @pseudocode
 * 1. Return `cachedSettings[key]`.
 *
 * @param {keyof Settings} key - The setting key to read.
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
