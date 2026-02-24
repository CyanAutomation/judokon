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

export function isDebugProfileEnabled(profile, options = {}) {
  const settings = getSettingsSnapshot(options.settings);
  const enabled = !!settings?.debugProfiles?.[profile];
  return enabled || hasLegacyFlagEnabled(settings, profile);
}

export function getDebugProfiles(settings) {
  return {
    ui: isDebugProfileEnabled("ui", { settings }),
    battle: isDebugProfileEnabled("battle", { settings }),
    cli: isDebugProfileEnabled("cli", { settings })
  };
}

export async function setDebugProfile(profile, enabled) {
  const settings = await loadSettings();
  const updatedProfiles = {
    ...(settings.debugProfiles || {}),
    [profile]: !!enabled
  };

  return updateSetting("debugProfiles", updatedProfiles);
}
