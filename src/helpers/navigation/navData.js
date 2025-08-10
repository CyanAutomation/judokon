import { debugLog } from "../debug.js";
import { loadSettings } from "../settingsStorage.js";
import { loadNavigationItems } from "../gameModeUtils.js";

/**
 * Validates game modes data to ensure all required properties are present.
 *
 * @pseudocode
 * 1. Filter out items missing `name` or `url` properties.
 * 2. Return the filtered array.
 *
 * @param {import("../types.js").GameMode[]} gameModes - The list of game modes to validate.
 * @returns {import("../types.js").GameMode[]} Validated game modes.
 */
export function validateGameModes(gameModes) {
  const validatedModes = gameModes.filter((mode) => mode.name && mode.url);
  debugLog("Validated modes:", validatedModes); // Debug validated modes
  return validatedModes;
}

/**
 * Load and validate main menu navigation items, marking hidden modes based on
 * user settings.
 *
 * @pseudocode
 * 1. Fetch all navigation items using `loadNavigationItems()`.
 * 2. Retrieve user settings via `loadSettings()`.
 * 3. Filter the modes to include only main menu items.
 * 4. Map each mode to set `isHidden` to true if originally hidden or disabled in settings.
 * 5. Sort the mapped modes by their `order` property.
 * 6. Validate the resulting array with `validateGameModes()`.
 * 7. Return the validated array.
 *
 * @returns {Promise<import("../types.js").GameMode[]>} Resolved array of game modes.
 */
export async function loadMenuModes() {
  const data = await loadNavigationItems();
  const settings = await loadSettings();
  return validateGameModes(
    data
      .filter((mode) => mode.category === "mainMenu")
      .map((mode) => ({
        ...mode,
        isHidden: mode.isHidden || settings.gameModes[mode.id] === false
      }))
      .sort((a, b) => a.order - b.order)
  );
}
