/**
 * Load saved settings and apply the user's display mode when the DOM is ready.
 *
 * @pseudocode
 * 1. Define `init`:
 *    a. Call `loadSettings()` to retrieve stored settings.
 *    b. Call `applyDisplayMode` with `settings.displayMode`.
 *    c. Log any errors to the console.
 * 2. If the document is already loaded, run `init` immediately.
 * 3. Otherwise, run `init` once on the `DOMContentLoaded` event.
 */
import { loadSettings } from "./settingsUtils.js";
import { applyDisplayMode } from "./displayMode.js";

async function init() {
  try {
    const settings = await loadSettings();
    applyDisplayMode(settings.displayMode);
  } catch (error) {
    console.error("Failed to apply display mode:", error);
  }
}

if (document.readyState !== "loading") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
