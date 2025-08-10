import { importJsonModule } from "./dataUtils.js";

/**
 * The settings JSON schema is loaded only when required to validate data.
 * This keeps module initialization lightweight in all environments.
 */
let settingsSchemaPromise;

/**
 * Lazily load the settings JSON schema.
 *
 * @pseudocode
 * 1. When `settingsSchemaPromise` is undefined, create a promise that
 *    attempts to fetch `settings.schema.json` relative to this module.
 * 2. On network failure, fall back to `importJsonModule`.
 * 3. Cache and return the promise.
 *
 * @returns {Promise<object>} Resolved JSON schema object.
 */
export async function getSettingsSchema() {
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

let defaultSettingsPromise;

/**
 * Load the default settings from disk.
 *
 * @pseudocode
 * 1. When `defaultSettingsPromise` is undefined, fetch `settings.json`.
 * 2. On failure, fall back to `importJsonModule`.
 * 3. Cache the loaded object and return a copy.
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
