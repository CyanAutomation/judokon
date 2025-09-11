/**
 * Toggles the visibility of the country flag panel, managing its open/closed state,
 * accessibility attributes, and focus.
 *
 * @summary This function controls the display of the country panel, including
 * its visual animation (slide-in/out) and proper ARIA attributes for accessibility.
 *
 * @pseudocode
 * 1. Determine the current open state of the `panel` by checking for the `open` CSS class.
 * 2. Calculate the `shouldOpen` state: if `show` is explicitly provided, use it; otherwise, invert the current `isOpen` state.
 * 3. If `shouldOpen` is true (opening the panel):
 *    a. Remove the `hidden` attribute from the `panel` to make it visible.
 *    b. Add the `open` class to trigger the slide-in animation.
 *    c. Set the `aria-expanded` attribute of the `toggleButton` to `true`.
 *    d. Attempt to focus the first flag button within the `panel` for improved accessibility.
 * 4. If `shouldOpen` is false (closing the panel):
 *    a. Remove the `open` class to trigger the slide-out animation.
 *    b. Add the `hidden` attribute to the `panel` to hide it from layout and assistive technologies.
 *    c. Set the `aria-expanded` attribute of the `toggleButton` to `false`.
 *    d. Return focus to the `toggleButton`.
 *
 * @param {HTMLButtonElement} toggleButton - The button that controls the panel's visibility.
 * @param {HTMLElement} panel - The country flag panel element.
 * @param {boolean} [show] - Optional. If `true`, forces the panel to open; if `false`, forces it to close. If omitted, toggles the current state.
 * @returns {void}
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
 * Toggles the display mode of the country panel between a default slide-in mode
 * and a full-screen grid mode.
 *
 * @summary This function applies or removes the `grid` CSS class to the panel
 * element, which visually transforms its layout.
 *
 * @pseudocode
 * 1. Check if the `panel` currently has the `grid` CSS class, indicating it's in grid mode.
 * 2. Determine the `shouldGrid` state: if `enable` is explicitly provided, use it; otherwise, invert the current `isGrid` state.
 * 3. If `shouldGrid` is true, add the `grid` class to the `panel`.
 * 4. If `shouldGrid` is false, remove the `grid` class from the `panel`.
 *
 * @param {HTMLElement} panel - The panel element whose display mode will be toggled.
 * @param {boolean} [enable] - Optional. If `true`, forces grid mode; if `false`, forces default mode. If omitted, toggles the current mode.
 * @returns {void}
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
