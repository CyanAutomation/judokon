/**
 * Synchronize the disclosure state of the country flag panel and manage focus affordances.
 *
 * @summary This helper leans on the native `<details>` behaviour by toggling the
 * `open` property directly, while ensuring focus and accessibility attributes stay
 * aligned with the rendered state.
 *
 * @pseudocode
 * 1. Determine the next state using the optional `show` parameter and the panel's
 *    native `open` property.
 * 2. Set the `open` property accordingly, mirroring the state back to
 *    `aria-expanded` on the summary toggle.
 * 3. Update the disclosure content's `aria-hidden` attribute to mirror visibility.
 * 4. When opening, focus the first flag button to keep keyboard navigation fluid.
 *    When closing, return focus to the toggle control.
 *
 * @param {HTMLElement|null} toggleButton - The summary element that toggles the panel.
 * @param {HTMLElement} panel - The `<details>` element representing the country panel.
 * @param {boolean} [show] - Optional. If provided, forces the target state; otherwise toggles the existing state.
 * @returns {void}
 */
export function toggleCountryPanel(toggleButton, panel, show) {
  if (!panel) {
    return;
  }

  /** @type {HTMLDetailsElement} */
  const details = panel;
  const shouldOpen = typeof show === "boolean" ? show : !details.open;
  details.open = shouldOpen;

  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  }

  const content = details.querySelector?.(".country-panel__content");
  if (content) {
    if (shouldOpen) {
      content.removeAttribute("aria-hidden");
      content.removeAttribute("inert");
    } else {
      content.setAttribute("aria-hidden", "true");
      content.setAttribute("inert", "");
    }
  }

  if (shouldOpen) {
    const firstButton = details.querySelector("button.flag-button");
    firstButton?.focus?.();
  } else {
    toggleButton?.focus?.();
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
