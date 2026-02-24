/**
 * Load saved settings and apply the user's display mode when the DOM is ready.
 *
 * @pseudocode
 * 1. Define `init`:
 *    a. Call `loadSettings()` to retrieve stored settings.
 *    b. Call `applyDisplayMode` with `settings.displayMode`.
 *    c. Call `applyMotionPreference` with `settings.motionEffects`.
 *    d. Call `toggleLayoutDebugPanel` with `featureFlags.isEnabled('layoutDebugPanel')`.
 *    e. Call `toggleTooltipOverlayDebug` with `featureFlags.isEnabled('tooltipOverlayDebug')`.
 *    f. Log any errors to the console.
 * 2. Use `onDomReady` to run `init` when the DOM is ready.
 */
import { applyDisplayMode, normalizeDisplayMode } from "./displayMode.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { toggleLayoutDebugPanel } from "./layoutDebugPanel.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { initFeatureFlags } from "./featureFlags.js";
import { isDebugProfileEnabled } from "./debugProfiles.js";
import { updateSetting } from "./settingsStorage.js";

async function init() {
  try {
    const settings = await initFeatureFlags();
    const normalizedMode = normalizeDisplayMode(settings.displayMode);
    applyDisplayMode(settings.displayMode);
    if (normalizedMode && normalizedMode !== settings.displayMode) {
      try {
        await updateSetting("displayMode", normalizedMode);
        settings.displayMode = normalizedMode;
      } catch {}
    }
    applyMotionPreference(settings.motionEffects);
    toggleLayoutDebugPanel(isDebugProfileEnabled("ui", { settings }));
    toggleTooltipOverlayDebug(isDebugProfileEnabled("ui", { settings }));
  } catch (error) {
    console.error("Failed to apply display mode:", error);
  }
}

onDomReady(init);
