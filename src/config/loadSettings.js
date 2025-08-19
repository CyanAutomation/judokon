import { DEFAULT_SETTINGS } from "./settingsDefaults.js";
import { importJsonModule } from "../helpers/dataUtils.js";

const SETTINGS_KEY = "settings";

let defaultSettingsPromise;

/**
 * Load the base settings JSON with caching and cloning.
 *
 * @pseudocode
 * 1. If `defaultSettingsPromise` exists, return a cloned result.
 * 2. Otherwise:
 *    a. Attempt to `fetch` `../data/settings.json`.
 *    b. On failure, fall back to `importJsonModule`.
 *    c. Cache the resulting promise in `defaultSettingsPromise`.
 * 3. Return a structured clone of the resolved settings.
 *
 * @returns {Promise<import("./settingsDefaults.js").Settings>} Cloned default settings.
 */
export async function loadDefaultSettings() {
  if (!defaultSettingsPromise) {
    defaultSettingsPromise = (async () => {
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
  return structuredClone(await defaultSettingsPromise);
}

/**
 * Deeply merge two objects without mutating them, dropping unknown keys.
 *
 * @param {object} base - Base object to merge into.
 * @param {object} override - Override values.
 * @param {object} defaults - Reference defaults for key validation.
 * @param {string[]} [path] - Current traversal path for warnings.
 * @returns {object} New merged object.
 */
function mergeKnown(base, override, defaults, path = []) {
  const result = { ...base };
  if (!override || typeof override !== "object") return result;

  for (const [key, value] of Object.entries(override)) {
    if (!(key in defaults)) {
      console.warn(`Unknown setting "${[...path, key].join(".")}" ignored`);
      continue;
    }
    const defVal = defaults[key];
    const baseVal = base[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      defVal &&
      typeof defVal === "object" &&
      !Array.isArray(defVal)
    ) {
      result[key] = mergeKnown(
        baseVal && typeof baseVal === "object" ? baseVal : {},
        value,
        defVal,
        [...path, key]
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Load settings with increasing precedence:
 * 1. {@link DEFAULT_SETTINGS}
 * 2. Fetched runtime JSON at `/src/data/settings.json`
 * 3. Local storage overrides
 *
 * @pseudocode
 * 1. Call `loadDefaultSettings()` to retrieve a cloned base configuration.
 * 2. Attempt to `fetch` runtime settings JSON and merge.
 * 3. Parse `localStorage` overrides and merge.
 * 4. Return merged `settings`.
 *
 * @returns {Promise<import("./settingsDefaults.js").Settings>} Resolved settings object.
 */
export async function loadSettings() {
  let settings = await loadDefaultSettings();

  try {
    const base = typeof import.meta.url === "string" ? import.meta.url : undefined;
    const url = new URL("../data/settings.json", base);
    const response = await fetch(url);
    if (response.ok) {
      const fetched = await response.json();
      settings = mergeKnown(settings, fetched, DEFAULT_SETTINGS);
    }
  } catch {
    // Ignore fetch failures or invalid JSON
  }

  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        settings = mergeKnown(settings, parsed, DEFAULT_SETTINGS);
      }
    }
  } catch {
    // Ignore localStorage unavailability or JSON errors
  }

  return settings;
}
