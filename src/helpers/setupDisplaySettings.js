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
import { applyDisplayMode } from "./displayMode.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { toggleLayoutDebugPanel } from "./layoutDebugPanel.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { initFeatureFlags, isEnabled } from "./featureFlags.js";

async function init() {
  try {
    const settings = await initFeatureFlags();
    applyDisplayMode(settings.displayMode);
    applyMotionPreference(settings.motionEffects);
    toggleLayoutDebugPanel(isEnabled("layoutDebugPanel"));
    toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
  } catch (error) {
    console.error("Failed to apply display mode:", error);
  }
}

onDomReady(init);
