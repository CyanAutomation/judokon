import { loadSettings } from "../config/loadSettings.js";
import { updateSetting } from "./settingsStorage.js";
import { setCachedSettings } from "./settingsCache.js";
import { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";

/**
 * Event emitter broadcasting feature flag changes.
 *
 * @type {EventTarget}
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export const featureFlagsEmitter = new EventTarget();

let cachedFlags = { ...DEFAULT_SETTINGS.featureFlags };

/**
 * Initialize feature flags from persisted settings.
 *
 * @pseudocode
 * 1. Call `loadSettings()` to retrieve current settings.
 * 2. Set `cachedFlags` and the global settings cache to `settings.featureFlags` or defaults.
 * 3. Dispatch a `change` event with `flag: null`.
 * 4. Return the loaded `settings`.
 *
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Loaded settings.
 */
export async function initFeatureFlags() {
  let settings;
  try {
    settings = await loadSettings();
    // Merge defaults with any persisted featureFlags so new flags are present by default
    const mergedFlags = {
      ...DEFAULT_SETTINGS.featureFlags,
      ...(settings.featureFlags || {})
    };
    cachedFlags = mergedFlags;
    // Keep cached settings in sync with the merged map used by `isEnabled`
    setCachedSettings({ ...settings, featureFlags: mergedFlags });
  } catch {
    settings = { ...DEFAULT_SETTINGS };
    cachedFlags = { ...DEFAULT_SETTINGS.featureFlags };
    setCachedSettings(settings);
  }
  featureFlagsEmitter.dispatchEvent(new CustomEvent("change", { detail: { flag: null } }));
  return settings;
}

/**
 * Check whether a feature flag is enabled.
 *
 * @pseudocode
 * 1. Return `cachedFlags[flag]?.enabled ?? false`.
 *
 * @param {string} flag - Feature flag name.
 * @returns {boolean} True when the flag is enabled.
 */
export function isEnabled(flag) {
  return cachedFlags[flag]?.enabled ?? false;
}

/**
 * Update a feature flag and persist the change.
 *
 * @pseudocode
 * 1. Call `loadSettings()` to retrieve current settings.
 * 2. Optionally warn if `flag` is not in `DEFAULT_SETTINGS.featureFlags`.
 * 3. Merge existing flag data with `{ enabled: value }` into `settings.featureFlags`.
 * 4. Persist the merged object with `updateSetting('featureFlags', merged)`.
 * 5. Update `cachedFlags` with the saved flags.
 * 6. Dispatch a `change` event on `featureFlagsEmitter`.
 * 7. Return the updated settings object.
 *
 * @param {string} flag - Feature flag to update.
 * @param {boolean} value - Desired enabled state.
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Updated settings.
 */
export async function setFlag(flag, value) {
  const settings = await loadSettings();
  if (!Object.hasOwn(DEFAULT_SETTINGS.featureFlags, flag)) {
    console.warn(`Unknown feature flag: ${flag}`);
  }
  const updatedFlags = {
    ...settings.featureFlags,
    [flag]: { ...(settings.featureFlags[flag] || {}), enabled: value }
  };
  const updated = await updateSetting("featureFlags", updatedFlags);
  cachedFlags = updated.featureFlags || {};
  featureFlagsEmitter.dispatchEvent(new CustomEvent("change", { detail: { flag, value } }));
  return updated;
}

// Sync changes across tabs by relaying storage events.
if (typeof window !== "undefined") {
  window.addEventListener("storage", async (e) => {
    // First try parsing the newValue payload directly (covering cross-tab updates and custom events)
    if (e.newValue) {
      try {
        const stored = JSON.parse(e.newValue);
        if (stored.featureFlags) {
          cachedFlags = stored.featureFlags;
          featureFlagsEmitter.dispatchEvent(new CustomEvent("change", { detail: { flag: null } }));
          return;
        }
      } catch {
        // ignore malformed payload
      }
    }
    // Fallback: when settings key changed or parsing failed, reload persisted settings
    if (e.key === "settings") {
      try {
        await initFeatureFlags();
      } catch {
        // ignore errors
      }
    }
  });
}
