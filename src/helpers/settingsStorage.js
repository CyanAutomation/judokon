import { validateWithSchema } from "./dataUtils.js";
import { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";
import { loadSettings as baseLoadSettings } from "../config/loadSettings.js";
import { setCachedSettings, getCachedSettings } from "./settingsCache.js";
import { debounce } from "../utils/debounce.js";

let setTimer = (...args) => setTimeout(...args);
let clearTimer = (...args) => clearTimeout(...args);

/**
 * Override timer functions used by the internal debounce.
 * @param {{ setTimeout?: typeof setTimeout, clearTimeout?: typeof clearTimeout }} [fns]
 */
/**
 * Override timer functions used by the internal debounce.
 *
 * Useful for tests that need to control timing or to inject fake timers.
 *
 * @pseudocode
 * 1. Accept an object with optional `setTimeout` and `clearTimeout`.
 * 2. Replace the local `setTimer` and `clearTimer` implementations when present.
 * 3. Subsequent debounced saves will use the injected timer functions.
 *
 * @param {{ setTimeout?: typeof setTimeout, clearTimeout?: typeof clearTimeout }} [fns]
 */
export function setSettingsStorageTimers(fns = {}) {
  if (fns.setTimeout) setTimer = fns.setTimeout;
  if (fns.clearTimeout) clearTimer = fns.clearTimeout;
}

const SETTINGS_KEY = "settings";
// Use a shorter debounce in test to reduce wall time while preserving semantics.
const IS_TEST =
  typeof process !== "undefined" &&
  process?.env &&
  (process.env.VITEST || process.env.NODE_ENV === "test");
const SAVE_DELAY_MS = IS_TEST ? 10 : 100;

const debouncedSave = debounce(
  (settings) => {
    if (typeof localStorage === "undefined") {
      throw new Error("localStorage unavailable");
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
  SAVE_DELAY_MS,
  { setTimeout: (...args) => setTimer(...args), clearTimeout: (...args) => clearTimer(...args) }
);

/**
 * Flush pending debounced save immediately.
 *
 * @pseudocode
 * 1. Call the debounced save's `flush` method so any queued write runs now.
 * 2. This is primarily intended for tests to force synchronous persistence.
 */
export const flushSettingsSave = () => debouncedSave.flush();

let settingsSchemaPromise;

/**
 * Lazily load the settings JSON schema.
 *
 * @pseudocode
 * 1. When no cached promise exists:
 *    a. Create `settingsSchemaPromise` that attempts to `fetch` the schema URL.
 *    b. On fetch failure, fall back to a dynamic `import()` (akin to `importJsonModule`).
 * 2. Return `settingsSchemaPromise` so subsequent calls reuse the cached schema.
 *
 * @returns {Promise<object>} Parsed schema object.
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
        return (await import("../schemas/settings.schema.json", { with: { type: "json" } }))
          .default;
      }
    })();
  }
  return settingsSchemaPromise;
}

/**
 * Persist settings to localStorage using a debounce.
 * Rapid successive saves will cancel prior promises.
 *
 * @pseudocode
 * 1. Invoke `debouncedSave` with `settings`.
 * 2. Return the resulting promise so callers can handle failures.
 *
 * @param {import("../config/settingsDefaults.js").Settings} settings - Settings object to save.
 * @returns {Promise<void>} Resolves when the write completes.
 */
export function saveSettings(settings) {
  return debouncedSave(settings);
}

/**
 * Load persisted settings from localStorage.
 *
 * @pseudocode
 * 1. Throw if `localStorage` is unavailable and load the settings schema.
 * 2. Read and parse JSON from `SETTINGS_KEY` to proactively catch errors.
 * 3. Load and merge settings via `baseLoadSettings`.
 * 4. Validate against the schema; on failure, reset storage and cache to defaults.
 * 5. Cache and return the merged settings.
 *
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Resolved settings object.
 */
export async function loadSettings() {
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  await getSettingsSchema();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      // Proactively parse to catch syntax errors.
      // The result isn't used here because baseLoadSettings handles merging.
      JSON.parse(raw);
    }
    const settings = await baseLoadSettings();
    await validateWithSchema(settings, await getSettingsSchema());
    setCachedSettings(settings);
    return settings;
  } catch (error) {
    console.debug("Invalid stored settings, resetting to defaults", error);
    localStorage.removeItem(SETTINGS_KEY);
    const copy = structuredClone(DEFAULT_SETTINGS);
    setCachedSettings(copy);
    return copy;
  }
}

/**
 * Update a single setting and persist the result.
 *
 * @pseudocode
 * 1. Queue the update to ensure previous writes finish first.
 * 2. Load the settings schema.
 * 3. Read the latest cached settings, refreshing from `localStorage` when available.
 * 4. Merge `key`/`value` into the settings object.
 * 5. Validate against the schema.
 * 6. Write to `localStorage` when available and update the cache.
 * 7. Return the updated settings.
 *
 * @param {string} key - Name of the setting to update.
 * @param {*} value - Value to assign to the setting.
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Updated settings object.
 */
let updateQueue = Promise.resolve();

/**
 * Update a single setting and persist the result safely.
 *
 * @description
 * Performs a queued update to prevent concurrent writes, validates the
 * resulting settings against the JSON schema, persists to storage when
 * available, and updates the in-memory cache.
 *
 * @pseudocode
 * 1. Append a `task` to the `updateQueue` to serialise updates.
 * 2. Ensure the settings schema is loaded via `getSettingsSchema()`.
 * 3. Read the current settings (from `localStorage` when available, or the cache).
 * 4. Merge the provided `key`/`value` into a shallow copy of the current settings.
 * 5. Validate the merged settings against the schema; throw on validation errors.
 * 6. If `localStorage` is available, write the JSON string of the updated settings.
 * 7. Update the in-memory cache via `setCachedSettings(updated)`.
 * 8. Return the updated settings object to the caller.
 *
 * Edge cases handled:
 * - Concurrent callers are serialised using `updateQueue` so only one write runs at a time.
 * - If `localStorage` is unavailable, the cache is still updated and returned.
 * - Validation errors propagate to the returned promise so callers can handle them.
 *
 * @param {string} key - Name of the setting to update.
 * @param {*} value - Value to assign to the setting.
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Updated settings object.
 */
export function updateSetting(key, value) {
  const task = async () => {
    await getSettingsSchema();
    const current =
      typeof localStorage !== "undefined" ? await loadSettings() : getCachedSettings();
    const updated = { ...current, [key]: value };
    await validateWithSchema(updated, await getSettingsSchema());
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    }
    setCachedSettings(updated);
    return updated;
  };

  const run = updateQueue.then(task);
  updateQueue = run.catch(() => {});
  return run;
}

/**
 * Reset all settings to their default values.
 *
 * @pseudocode
 * 1. Overwrite `SETTINGS_KEY` in `localStorage` with `DEFAULT_SETTINGS`.
 * 2. Ignore errors if `localStorage` is unavailable or write fails.
 * 3. Reset the cache and return the defaults.
 *
 * @returns {import("../config/settingsDefaults.js").Settings} The default settings object.
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
  // Update in-memory cache synchronously
  setCachedSettings(DEFAULT_SETTINGS);
  return getCachedSettings();
}
