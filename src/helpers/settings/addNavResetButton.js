/**
 * Inject a "Reset Navigation Cache" button when the feature flag is enabled.
 *
 * @pseudocode
 * 1. Remove any existing reset button.
 * 2. If the feature flags container or feature flag is missing, exit.
 * 3. Create and append the button via `createButton`.
 * 4. On click, clear the navigation cache, repopulate the navbar, and show confirmation.
 */
import { createButton } from "../../components/Button.js";
import { reset as resetNavigationCache } from "../navigationCache.js";
import { populateNavbar } from "../navigationBar.js";
import { showSnackbar } from "../showSnackbar.js";
import { isEnabled } from "../featureFlags.js";

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
export function addNavResetButton() {
  const section = document.getElementById("feature-flags-container");
  const existing = document.getElementById("nav-cache-reset-button");
  existing?.parentElement?.remove();
  if (!section) return;
  if (!isEnabled("navCacheResetButton")) return;
  const wrapper = document.createElement("div");
  wrapper.className = "settings-item";
  const btn = createButton("Reset Navigation Cache", {
    id: "nav-cache-reset-button"
  });
  wrapper.appendChild(btn);
  section.appendChild(wrapper);
  btn.addEventListener("click", () => {
    resetNavigationCache();
    populateNavbar();
    showSnackbar("Navigation cache cleared");
  });
}
