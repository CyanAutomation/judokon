/**
 * Load saved settings and apply the user's display mode when the DOM is ready.
 *
 * @pseudocode
 * 1. Define `init`:
 *    a. Call `loadSettings()` to retrieve stored settings.
 *    b. Call `applyDisplayMode` with `settings.displayMode`.
 *    c. Call `applyMotionPreference` with `settings.motionEffects`.
 *    d. Call `toggleViewportSimulation` with `featureFlags.isEnabled('viewportSimulation')`.
 *    e. Call `toggleLayoutDebugPanel` with `featureFlags.isEnabled('layoutDebugPanel')`.
 *    e. Log any errors to the console.
 * 2. Use `onDomReady` to run `init` when the DOM is ready.
 */
import { loadSettings } from "./settingsUtils.js";
import { applyDisplayMode } from "./displayMode.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { toggleLayoutDebugPanel } from "./layoutDebugPanel.js";
import { isEnabled } from "./featureFlags.js";

async function init() {
  try {
    const settings = await loadSettings();
    applyDisplayMode(settings.displayMode);
    applyMotionPreference(settings.motionEffects);
    toggleViewportSimulation(isEnabled("viewportSimulation"));
    toggleLayoutDebugPanel(isEnabled("layoutDebugPanel"));
  } catch (error) {
    console.error("Failed to apply display mode:", error);
  }
}

onDomReady(init);
