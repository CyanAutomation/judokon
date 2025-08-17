import { importJsonModule } from "./dataUtils.js";

// Lazily cached promises
let settingsSchemaPromise;

/**
 * Lazily load the settings JSON schema.
 * @returns {Promise<object>}
 */
export async function getSettingsSchema() {
  if (!settingsSchemaPromise) {
    settingsSchemaPromise = (async () => {
      const base = typeof import.meta.url === "string" ? import.meta.url : undefined;
      try {
        const url = new URL("../schemas/settings.schema.json", base);
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch settings schema");
        return await response.json();
      } catch {
        return importJsonModule("../schemas/settings.schema.json");
      }
    })();
  }
  return settingsSchemaPromise;
}

/**
 * Load default settings once and reuse them.
 * @returns {Promise<Settings>}
 */
const promiseSymbol = Symbol.for("defaultSettingsPromise");

if (!globalThis[promiseSymbol]) {
  globalThis[promiseSymbol] = (async () => {
    const base = typeof import.meta.url === "string" ? import.meta.url : undefined;
    try {
      const url = new URL("../data/settings.json", base);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch default settings");
      return await response.json();
    } catch {
      return importJsonModule("../data/settings.json");
    }
  })();
}

export const defaultSettingsPromise = globalThis[promiseSymbol];

// Synchronous default settings value via top-level await for tests and consumers
// that need an eagerly available object for comparisons.
export const DEFAULT_SETTINGS = await defaultSettingsPromise;

/**
 * Return a cloned copy of default settings.
 * @returns {Promise<Settings>}
 */
export async function loadDefaultSettings() {
  const data = await defaultSettingsPromise;
  return { ...data };
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
