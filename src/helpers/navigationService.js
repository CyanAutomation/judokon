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
