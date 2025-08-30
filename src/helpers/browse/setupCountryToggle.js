import { createCountrySlider } from "../countrySlider.js";
import { toggleCountryPanel } from "../countryPanel.js";
import { handleKeyboardNavigation } from "./handleKeyboardNavigation.js";

/**
 * Handle a click on the country toggle button.
 *
 * @pseudocode
 * 1. Determine if panel was open.
 * 2. Toggle the panel state.
 * 3. If opening for the first time, load country slider.
 *
 * @param {HTMLButtonElement} toggleButton
 * @param {Element} panel
 * @param {Element} listContainer
 * @returns {Promise<void>}
 */
export async function handleToggleClick(toggleButton, panel, listContainer) {
  const wasOpen = panel.classList.contains("open");
  toggleCountryPanel(toggleButton, panel);
  if (!wasOpen && listContainer.children.length === 0) {
    await createCountrySlider(listContainer);
  }
}

/**
 * Handle keydown interactions within the country panel.
 *
 * @pseudocode
 * 1. If Escape, close the panel.
 * 2. If ArrowRight/ArrowLeft, delegate to keyboard navigation helper.
 *
 * @param {KeyboardEvent} event
 * @param {HTMLButtonElement} toggleButton
 * @param {Element} panel
 * @param {Element} listContainer
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Handle keydown events inside the country panel.
 *
 * @summary Close the panel on Escape and delegate ArrowLeft/ArrowRight to keyboard navigation.
 * @pseudocode
 * 1. If Escape key, close the panel via `toggleCountryPanel(toggleButton, panel, false)`.
 * 2. If Arrow keys, call `handleKeyboardNavigation` with the list container and `flag-button`.
 *
 * @param {KeyboardEvent} event - The keydown event.
 * @param {HTMLButtonElement} toggleButton - Panel toggle button to control open/close.
 * @param {Element} panel - The panel element.
 * @param {Element} listContainer - Container that holds flag buttons.
 * @returns {void}
 */
export function handlePanelKeydown(event, toggleButton, panel, listContainer) {
  if (event.key === "Escape") {
    toggleCountryPanel(toggleButton, panel, false);
  }

  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    handleKeyboardNavigation(event, listContainer, "flag-button");
  }
}

/**
 * Set up the country selection panel toggle behavior.
 *
 * @pseudocode
 * 1. Attach click handler for toggle button.
 * 2. Attach keydown handler for panel interactions.
 * 3. Return a function indicating if countries are loaded.
 *
 * @param {HTMLButtonElement} toggleButton
 * @param {Element} panel
 * @param {Element} listContainer
 * @returns {() => boolean} Function returning true when countries are loaded.
 */
export function setupCountryToggle(toggleButton, panel, listContainer) {
  const countriesLoaded = () => listContainer.children.length > 0;

  toggleButton.addEventListener("click", () =>
    handleToggleClick(toggleButton, panel, listContainer)
  );

  panel.addEventListener("keydown", (e) =>
    handlePanelKeydown(e, toggleButton, panel, listContainer)
  );

  return countriesLoaded;
}

export default setupCountryToggle;
