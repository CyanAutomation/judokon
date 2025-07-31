/**
 * Load saved settings and apply the user's display mode when the DOM is ready.
 *
 * @pseudocode
 * 1. Define `init`:
 *    a. Call `loadSettings()` to retrieve stored settings.
 *    b. Call `applyDisplayMode` with `settings.displayMode`.
 *    c. Call `applyMotionPreference` with `settings.motionEffects`.
 *    d. Call `toggleViewportSimulation` with `settings.featureFlags.viewportSimulation.enabled`.
 *    e. Log any errors to the console.
 * 2. Use `onDomReady` to run `init` when the DOM is ready.
 */
import { loadSettings } from "./settingsUtils.js";
import { applyDisplayMode } from "./displayMode.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { toggleViewportSimulation } from "./viewportDebug.js";

async function init() {
  try {
    const settings = await loadSettings();
    applyDisplayMode(settings.displayMode);
    applyMotionPreference(settings.motionEffects);
    toggleViewportSimulation(Boolean(settings.featureFlags.viewportSimulation?.enabled));
  } catch (error) {
    console.error("Failed to apply display mode:", error);
  }
}

onDomReady(init);
