/**
 * Toggle the visibility of the country flag panel.
 *
 * @pseudocode
 * 1. Determine if the panel is currently open using the `open` class.
 * 2. Decide the next state based on the optional `show` parameter or the
 *    current state.
 * 3. If opening:
 *    a. Remove the `hidden` attribute from the panel.
 *    b. Add the `open` class for the slide-in animation.
 *    c. Set `aria-expanded` on the toggle button to `true`.
 *    d. Focus the first flag button inside the panel if it exists.
 * 4. If closing:
 *    a. Add the `hidden` attribute to hide the panel.
 *    b. Remove the `open` class.
 *    c. Set `aria-expanded` on the toggle button to `false`.
 *    d. Return focus to the toggle button.
 *
 * @param {HTMLButtonElement} toggleButton - The controlling button.
 * @param {HTMLElement} panel - The panel element.
 * @param {boolean} [show] - Force open (`true`) or closed (`false`).
 */
export function toggleCountryPanel(toggleButton, panel, show) {
  const isOpen = panel.classList.contains("open");
  const shouldOpen = typeof show === "boolean" ? show : !isOpen;

  if (shouldOpen) {
    // Ensure the panel is exposed to assistive tech and the layout before
    // starting the open animation.
    panel.removeAttribute("hidden");
    panel.classList.add("open");
    toggleButton.setAttribute("aria-expanded", "true");
    const firstButton = panel.querySelector("button.flag-button");
    firstButton?.focus();
  } else {
    // Hide the panel from layout and assistive tech when closed.
    panel.classList.remove("open");
    panel.setAttribute("hidden", "");
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.focus();
  }
}

/**
 * Toggle the panel between slide-in and full-screen grid modes.
 *
 * @pseudocode
 * 1. Check if the panel currently has the `grid` class.
 * 2. Determine the desired state using the optional `enable` parameter
 *    or by inverting the current state.
 * 3. If enabling grid mode, add the `grid` class; otherwise remove it.
 *
 * @param {HTMLElement} panel - The panel element to update.
 * @param {boolean} [enable] - Force grid mode on (`true`) or off (`false`).
 */
export function toggleCountryPanelMode(panel, enable) {
  const isGrid = panel.classList.contains("grid");
  const shouldGrid = typeof enable === "boolean" ? enable : !isGrid;

  if (shouldGrid) {
    panel.classList.add("grid");
  } else {
    panel.classList.remove("grid");
  }
}
