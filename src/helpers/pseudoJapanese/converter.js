import { DATA_DIR } from "../constants.js";
import { seededRandom } from "../testModeUtils.js";

export const STATIC_FALLBACK = "\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8"; // 日本語風テキスト
let cachedConverter;
let lastFetch;

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
export async function loadConverter() {
  if (cachedConverter && lastFetch === fetch) {
    return cachedConverter;
  }
  lastFetch = fetch;
  try {
    const response = await fetch(`${DATA_DIR}japaneseConverter.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch converter mapping: ${response.status}`);
    }
    cachedConverter = await response.json();
  } catch {
    cachedConverter = null;
  }
  return cachedConverter;
}

/**
 * Convert English text to pseudo-Japanese using a JSON lookup table.
 *
 * @pseudocode
 * 1. If input is null, undefined, or empty string, return empty string.
 * 2. Load the converter JSON using `loadConverter`.
 *    - If loading fails, return `STATIC_FALLBACK`.
 * 3. Clean the `text` by removing characters other than letters, numbers, and whitespace.
 * 4. Build a list of fallback characters from the mapping values.
 * 5. If the cleaned text contains only digits and whitespace, return an empty
 *    string.
 * 6. For each character in the cleaned text:
 *    - Preserve whitespace characters as-is.
 *    - Map letters (case-insensitive) using the converter table when possible.
 *    - Replace digits and unmapped letters with a random fallback character.
 *      - Use `seededRandom()` for deterministic output in Test Mode.
 * 7. Join and return the converted string.
 *
 * @param {string} input - The text to convert.
 * @returns {Promise<string>} The pseudo-Japanese representation.
 */
export async function convertToPseudoJapanese(input) {
  if (input === undefined || input === null || input === "") return "";

  const converter = await loadConverter();
  if (!converter || !converter.letters) {
    return STATIC_FALLBACK;
  }

  const mapping = converter.letters;
  const cleaned = String(input).replace(/[^A-Za-z0-9\s]/g, "");
  const fallbackChars = Object.values(mapping).flat();

  if (/^[0-9\s]*$/.test(cleaned)) {
    return "";
  }

  return cleaned
    .split("")
    .map((char) => {
      if (/\s/.test(char)) {
        return char;
      }

      const letters = mapping[char.toLowerCase()];
      if (letters) {
        return letters[Math.floor(seededRandom() * letters.length)];
      }

      // digits or unmapped letters
      return fallbackChars[Math.floor(seededRandom() * fallbackChars.length)];
    })
    .join("");
}
