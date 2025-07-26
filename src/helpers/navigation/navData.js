import { debugLog } from "../debug.js";
import { loadSettings } from "../settingsUtils.js";
import { loadGameModes } from "../gameModeUtils.js";

/**
 * Validates game modes data to ensure all required properties are present.
 *
 * @pseudocode
 * 1. Filter out items missing `name` or `url` properties.
 * 2. Return the filtered array.
 *
 * @param {Array} gameModes - The list of game modes to validate.
 * @returns {Array} Validated game modes.
 */
export function validateGameModes(gameModes) {
  const validatedModes = gameModes.filter((mode) => mode.name && mode.url);
  debugLog("Validated modes:", validatedModes); // Debug validated modes
  return validatedModes;
}

/**
 * Load and validate active main menu game modes.
 *
 * @pseudocode
 * 1. Fetch all game modes using `loadGameModes()`.
 * 2. Retrieve user settings via `loadSettings()`.
 * 3. Filter the modes to include only visible main menu items not disabled in settings.
 * 4. Sort the filtered modes by their `order` property.
 * 5. Validate the resulting array with `validateGameModes()`.
 * 6. Return the validated array.
 *
 * @returns {Promise<Array>} Resolved array of active game modes.
 */
export async function loadMenuModes() {
  const data = await loadGameModes();
  const settings = await loadSettings();
  return validateGameModes(
    data
      .filter(
        (mode) =>
          mode.category === "mainMenu" &&
          mode.isHidden === false &&
          settings.gameModes[mode.id] !== false
      )
      .sort((a, b) => a.order - b.order)
  );
}
