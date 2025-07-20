import { populateCountryList } from "./country/index.js";

/**
 * Build a horizontally scrolling slider of country flags.
 *
 * @pseudocode
 * 1. Use `populateCountryList` to render flag buttons inside the provided container.
 *
 * @param {HTMLElement} container - The slide track element that receives the flag buttons.
 * @returns {Promise<void>} Resolves when the slider has been created.
 */
export async function createCountrySlider(container) {
  if (!container) return;

  await populateCountryList(container);
}
