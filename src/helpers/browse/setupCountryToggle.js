import { createCountrySlider } from "../countrySlider.js";
import { toggleCountryPanel } from "../countryPanel.js";
import { handleKeyboardNavigation } from "./handleKeyboardNavigation.js";

/**
 * Set up the country selection panel toggle behavior.
 *
 * @pseudocode
 * 1. On toggleButton click:
 *    a. Toggle panel open state.
 *    b. If opening for the first time, initialize country slider.
 * 2. On panel keydown:
 *    a. Close panel on 'Escape'.
 *    b. Navigate slider buttons with ArrowLeft/ArrowRight.
 * 3. Return a function indicating if countries are loaded.
 *
 * @param {HTMLButtonElement} toggleButton
 * @param {Element} panel
 * @param {Element} listContainer
 * @returns {() => boolean} Function returning true when countries are loaded.
 */
export function setupCountryToggle(toggleButton, panel, listContainer) {
  const countriesLoaded = () => listContainer.children.length > 0;

  toggleButton.addEventListener("click", async () => {
    const wasOpen = panel.classList.contains("open");
    toggleCountryPanel(toggleButton, panel);
    if (!wasOpen && !countriesLoaded()) {
      await createCountrySlider(listContainer);
    }
  });

  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleCountryPanel(toggleButton, panel, false);
    }

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      handleKeyboardNavigation(e, listContainer, "flag-button");
    }
  });

  return countriesLoaded;
}

export default setupCountryToggle;
