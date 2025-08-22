import { debugLog } from "../debug.js";

/**
 * Convert a game mode name to a camelCase key for tooltip ids.
 *
 * @pseudocode
 * 1. Replace non-alphanumeric characters with spaces.
 * 2. Split into words.
 * 3. Lowercase the first word and capitalize the rest.
 * 4. Join the words without spaces.
 *
 * @param {string} name - Game mode name.
 * @returns {string} camelCase key.
 */
export function navTooltipKey(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join("");
}

/**
 * Escape special HTML characters to prevent injection.
 *
 * @pseudocode
 * 1. Convert the input to a string.
 * 2. Replace `&`, `<`, `>`, `"`, and `'` with their HTML entity equivalents.
 *
 * @param {unknown} value - The value to escape.
 * @returns {string} Escaped string safe for HTML insertion.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Base path for navigation links derived from the current module location.
 */
export const BASE_PATH = (() => {
  const url = new URL(import.meta.url);
  url.pathname = url.pathname.replace(/helpers\/navigation\/navigationService.js$/, "pages/");
  return url;
})();

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
