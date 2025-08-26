import { DEFAULT_SETTINGS } from "./settingsDefaults.js";

const SETTINGS_KEY = "settings";

/**
 * Merge `override` into `base` following `defaults` structure.
 *
 * @param {any} base - Existing value.
 * @param {any} override - Override value.
 * @param {any} defaults - Defaults reference for nested validation.
 * @param {string[]} [path]
 * @returns {any} Merged result.
 */
function mergeObject(base, override, defaults, path = []) {
  if (
    !override ||
    typeof override !== "object" ||
    Array.isArray(override) ||
    !defaults ||
    typeof defaults !== "object" ||
    Array.isArray(defaults)
  ) {
    return override;
  }

  const result = { ...(base && typeof base === "object" ? base : {}) };

  for (const [key, value] of Object.entries(override)) {
    result[key] = mergeObject(
      base && typeof base === "object" ? base[key] : undefined,
      value,
      defaults[key],
      [...path, key]
    );
  }

  return result;
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
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return { ...base };
  }

  const result = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (path.length === 0 && !(key in defaults)) {
      console.warn(`Unknown setting "${[...path, key].join(".")}" ignored`);
      continue;
    }

    result[key] = mergeObject(base[key], value, defaults[key], [...path, key]);
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
