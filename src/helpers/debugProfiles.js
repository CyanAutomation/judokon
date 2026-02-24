import { getCachedSettings } from "./settingsCache.js";
import { updateSetting } from "./settingsStorage.js";
import { loadSettings } from "../config/loadSettings.js";

const LEGACY_PROFILE_FLAG_MAP = Object.freeze({
  ui: ["layoutDebugPanel", "tooltipOverlayDebug", "enableCardInspector"],
  battle: ["battleStateProgress"],
  cli: ["cliVerbose"]
});

function getSettingsSnapshot(settings) {
  if (settings && typeof settings === "object") {
    return settings;
  }
  return getCachedSettings();
}

function hasLegacyFlagEnabled(settings, profile) {
  const flags = settings?.featureFlags;
  if (!flags || typeof flags !== "object") {
    return false;
  }

  return (LEGACY_PROFILE_FLAG_MAP[profile] || []).some((flag) => {
    const entry = flags[flag];
    return !!(entry && typeof entry === "object" && entry.enabled);
  });
}

/**
 * Resolve whether a debug profile is enabled.
 *
 * @pseudocode
 * 1. Resolve a settings snapshot from `options.settings` or cache.
 * 2. Read the grouped `debugProfiles[profile]` value.
 * 3. If grouped value is false, evaluate mapped legacy flags for this profile.
 * 4. Return true when either grouped or legacy source is enabled.
 *
 * @param {"ui"|"battle"|"cli"|string} profile - Debug profile key to resolve.
 * @param {{ settings?: Record<string, any> }} [options={}] - Optional settings override.
 * @returns {boolean} True when the profile should be treated as enabled.
 */
export function isDebugProfileEnabled(profile, options = {}) {
  const settings = getSettingsSnapshot(options.settings);
  const enabled = !!settings?.debugProfiles?.[profile];
  return enabled || hasLegacyFlagEnabled(settings, profile);
}

/**
 * Get the effective enabled state for all debug profiles.
 *
 * @pseudocode
 * 1. Resolve `ui` profile state via `isDebugProfileEnabled`.
 * 2. Resolve `battle` profile state via `isDebugProfileEnabled`.
 * 3. Resolve `cli` profile state via `isDebugProfileEnabled`.
 * 4. Return an object containing all resolved profile booleans.
 *
 * @param {Record<string, any>} [settings] - Optional settings snapshot.
 * @returns {{ ui: boolean, battle: boolean, cli: boolean }} Effective profile states.
 */
export function getDebugProfiles(settings) {
  return {
    ui: isDebugProfileEnabled("ui", { settings }),
    battle: isDebugProfileEnabled("battle", { settings }),
    cli: isDebugProfileEnabled("cli", { settings })
  };
}

/**
 * Persist a single debug profile toggle in grouped settings.
 *
 * @pseudocode
 * 1. Load the latest settings snapshot.
 * 2. Merge existing `debugProfiles` with the provided profile update.
 * 3. Normalize `enabled` to a boolean.
 * 4. Persist merged `debugProfiles` via `updateSetting`.
 *
 * @param {"ui"|"battle"|"cli"|string} profile - Debug profile key to update.
 * @param {boolean} enabled - Desired enabled state.
 * @returns {Promise<any>} Promise from `updateSetting` persistence.
 */
export async function setDebugProfile(profile, enabled) {
  const settings = await loadSettings();
  const updatedProfiles = {
    ...(settings.debugProfiles || {}),
    [profile]: !!enabled
  };

  return updateSetting("debugProfiles", updatedProfiles);
}
