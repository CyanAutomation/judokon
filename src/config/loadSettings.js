import { DEFAULT_SETTINGS } from "./settingsDefaults.js";

const SETTINGS_KEY = "settings";

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
 * 1. Clone `DEFAULT_SETTINGS` into `settings`.
 * 2. Attempt to `fetch` runtime settings JSON and merge.
 * 3. Parse `localStorage` overrides and merge.
 * 4. Return merged `settings`.
 *
 * @returns {Promise<import("./settingsDefaults.js").Settings>} Resolved settings object.
 */
export async function loadSettings() {
  let settings = structuredClone(DEFAULT_SETTINGS);

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
