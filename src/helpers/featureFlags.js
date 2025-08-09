import { loadSettings, updateSetting } from "./settingsUtils.js";

/**
 * Event emitter broadcasting feature flag changes.
 *
 * @type {EventTarget}
 */
export const featureFlagsEmitter = new EventTarget();

let cachedFlags = {};
try {
  const settings = await loadSettings();
  cachedFlags = settings.featureFlags || {};
} catch {
  cachedFlags = {};
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
 * 2. Merge `flag`/`value` into `settings.featureFlags`.
 * 3. Persist the merged object with `updateSetting('featureFlags', merged)`.
 * 4. Update `cachedFlags` with the saved flags.
 * 5. Dispatch a `change` event on `featureFlagsEmitter`.
 * 6. Return the updated settings object.
 *
 * @param {string} flag - Feature flag to update.
 * @param {boolean} value - Desired enabled state.
 * @returns {Promise<import("./settingsUtils.js").Settings>} Updated settings.
 */
export async function setFlag(flag, value) {
  const settings = await loadSettings();
  const updatedFlags = {
    ...settings.featureFlags,
    [flag]: {
      ...settings.featureFlags[flag],
      enabled: value
    }
  };
  const updated = await updateSetting("featureFlags", updatedFlags);
  cachedFlags = updated.featureFlags || {};
  featureFlagsEmitter.dispatchEvent(new CustomEvent("change", { detail: { flag, value } }));
  return updated;
}

// Sync changes across tabs by relaying storage events.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "settings") {
      loadSettings()
        .then((s) => {
          cachedFlags = s.featureFlags || {};
          featureFlagsEmitter.dispatchEvent(new CustomEvent("change", { detail: { flag: null } }));
        })
        .catch(() => {});
    }
  });
}
