import { addNavResetButton } from "./addNavResetButton.js";

/**
 * @summary Render the Navigation Cache reset button when enabled.
 * @pseudocode
 * 1. Attempt to inject the reset button via `addNavResetButton`.
 * 2. Find the corresponding feature flag toggle.
 * 3. Bind a change listener once to rerender the button on toggle.
 * @returns {void}
 */

export function renderNavCacheReset() {
  addNavResetButton();
  const toggle = document.getElementById("feature-nav-cache-reset-button");
  if (toggle && !toggle.dataset.listenerBound) {
    toggle.addEventListener("change", addNavResetButton);
    toggle.dataset.listenerBound = "true";
  }
}
