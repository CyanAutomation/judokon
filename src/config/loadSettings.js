import { normalizeDisplayMode } from "../helpers/displayMode.js";

const LEGACY_IGNORED_UNKNOWN_SETTINGS = new Set([
  "featureFlags.roundStore",
  "tooltipIds.roundStore",
  "featureFlags.battleStateProgress",
  "featureFlags.cliVerbose",
  "featureFlags.enableCardInspector",
  "featureFlags.layoutDebugPanel",
  "featureFlags.tooltipOverlayDebug"
]);

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
    if (!(key in defaults)) {
      const unknownPath = [...path, key].join(".");
      if (LEGACY_IGNORED_UNKNOWN_SETTINGS.has(unknownPath)) {
        result[key] = value;
        continue;
      }
      console.warn(`Unknown setting "${unknownPath}" ignored`);
      continue;
    }

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
    if (!(key in defaults)) {
      const unknownPath = [...path, key].join(".");
      if (LEGACY_IGNORED_UNKNOWN_SETTINGS.has(unknownPath)) {
        result[key] = value;
        continue;
      }
      if (!LEGACY_IGNORED_UNKNOWN_SETTINGS.has(unknownPath)) {
        console.warn(`Unknown setting "${unknownPath}" ignored`);
      }
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
 * @param {{ defaults?: import("./settingsDefaults.js").Settings }} [options]
 * `defaults` - Optional defaults override used primarily for tests.
 * @returns {Promise<import("./settingsDefaults.js").Settings>} Resolved settings object.
 */
export async function loadSettings(options = {}) {
  const defaults = options?.defaults ?? (await import("./settingsDefaults.js")).DEFAULT_SETTINGS;
  let settings = structuredClone(defaults);

  try {
    const base = typeof import.meta.url === "string" ? import.meta.url : undefined;
    const url = new URL("../data/settings.json", base);
    const response = await fetch(url);
    if (response.ok) {
      const fetched = await response.json();
      settings = mergeKnown(settings, fetched, defaults);
    }
  } catch {
    // Ignore fetch failures or invalid JSON
  }

  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        settings = mergeKnown(settings, parsed, defaults);
      }
    }
  } catch {
    // Ignore localStorage unavailability or JSON errors
  }
  if (settings) {
    const normalizedDisplayMode = normalizeDisplayMode(settings.displayMode);
    if (normalizedDisplayMode) {
      if (normalizedDisplayMode !== settings.displayMode) {
        settings = { ...settings, displayMode: normalizedDisplayMode };
      }
    } else if (defaults?.displayMode) {
      const defaultMode = normalizeDisplayMode(defaults.displayMode) ?? "light";
      console.warn(
        `Unknown display mode "${settings.displayMode}" encountered. Falling back to "${defaultMode}".`
      );
      settings = { ...settings, displayMode: defaultMode };
    }
  }

  return settings;
}
