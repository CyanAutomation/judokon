import { populateCountryList } from "./country/list.js";

/**
 * Build a horizontally scrolling slider of country flags for filtering judoka cards by country.
 *
 * @pseudocode
 * 1. Validate the container element; exit if not present.
 * 2. Use `populateCountryList` to render a radio-group of flag options inside the container.
 *    - Each radio option exposes an aria-label ("Filter by {country}") and associated flag alt text for accessibility.
 *    - Countries are displayed in alphabetical order, only for those present in `judoka.json`.
 *    - Each radio supports keyboard navigation (Tab/Shift+Tab, Arrow keys, Enter/Space to select).
 *    - If a flag asset fails to load, a fallback icon is shown.
 *    - The flag slider supports touch and mouse interaction, and minimum tap target size (44x44px).
 * 3. The slider integrates with the card carousel to filter visible judoka by country.
 * 4. If no countries are available, display a message: "No countries available."
 *
 * See PRD: Country Picker Filter and PRD: Browse Judoka for full requirements.
 *
 * @param {HTMLElement} container - The slide track element that receives the flag buttons.
 * @returns {Promise<void>} Resolves when the slider has been created.
 */
export async function createCountrySlider(container) {
  if (!container) return;

  await populateCountryList(container);
}
