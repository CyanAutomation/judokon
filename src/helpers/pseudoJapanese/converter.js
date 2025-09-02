import { seededRandom } from "../testModeUtils.js";
import converter from "../../data/japaneseConverter.js";

export const STATIC_FALLBACK = "\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8"; // 日本語風テキスト

/**
 * Convert English text to pseudo-Japanese using a lookup table.
 *
 * @pseudocode
 * 1. If `input` is `null`, `undefined`, or an empty string, return an empty string.
 * 2. Use the imported converter mapping.
 *    - If the mapping is missing, return `STATIC_FALLBACK`.
 * 3. Clean the text by removing characters other than letters, numbers, and whitespace.
 *    - Build a list of fallback characters from the mapping values.
 * 4. If the cleaned text contains only digits and whitespace, return an empty string.
 * 5. For each character in the cleaned text:
 *    - Preserve whitespace characters as-is.
 *    - Map letters (case-insensitive) when possible.
 *    - Replace digits and unmapped letters with a random fallback character.
 *      - Use `seededRandom()` for deterministic output in Test Mode.
 * 6. Join and return the converted string.
 *
 * @param {string} input - The text to convert.
 * @returns {string} The pseudo-Japanese representation.
 */
export function convertToPseudoJapanese(input) {
  if (input === undefined || input === null || input === "") return "";

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
