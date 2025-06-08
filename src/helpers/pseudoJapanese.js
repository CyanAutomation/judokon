import { DATA_DIR } from "./constants.js";
import { fetchDataWithErrorHandling } from "./dataUtils.js";

const STATIC_FALLBACK = "\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8"; // 日本語風テキスト
let converterPromise;

async function loadConverter() {
  if (!converterPromise) {
    converterPromise = fetchDataWithErrorHandling(`${DATA_DIR}japaneseConverter.json`).catch(
      () => null
    );
  }
  return converterPromise;
}

/**
 * Convert English text to pseudo-Japanese using a JSON lookup table.
 *
 * @pseudocode
 * 1. Load the converter JSON once using `loadConverter`.
 *    - If loading fails, return `STATIC_FALLBACK`.
 * 2. Clean the `text` by removing characters other than letters, numbers, and spaces.
 * 3. Build a list of fallback characters from the mapping values.
 * 4. For each character in the cleaned text:
 *    - Preserve spaces as-is.
 *    - Map letters (case-insensitive) using the converter table.
 *    - Replace unmapped characters with a random fallback character.
 * 5. Join and return the converted string.
 *
 * @param {string} text - The text to convert.
 * @returns {Promise<string>} The pseudo-Japanese representation.
 */
export async function convertToPseudoJapanese(text) {
  const converter = await loadConverter();
  if (!converter || !converter.letters) {
    return STATIC_FALLBACK;
  }

  const mapping = converter.letters;
  const fallback = Object.values(mapping).flat();
  const cleaned = String(text).replace(/[^A-Za-z0-9\s]/g, "");

  return cleaned
    .split("")
    .map((char) => {
      if (char === " ") {
        return char;
      }
      const letters = mapping[char.toLowerCase()];
      if (letters) {
        return letters[Math.floor(Math.random() * letters.length)];
      }
      return fallback[Math.floor(Math.random() * fallback.length)];
    })
    .join("");
}

/**
 * Create a button that toggles an element's text between English and pseudo-Japanese.
 *
 * @pseudocode
 * 1. Generate pseudo-Japanese text from `originalText` using `convertToPseudoJapanese`.
 * 2. Create a button labeled "日本語風 / English" and attach a click handler.
 * 3. On click, fade out the element over 200ms, swap its text, then fade back in.
 * 4. Return the button so callers can insert it into the DOM.
 *
 * @param {HTMLElement} element - The element whose text will be toggled.
 * @param {string} originalText - The English text to display when untoggled.
 * @returns {Promise<HTMLButtonElement>} A promise that resolves to the toggle button.
 */
export async function setupLanguageToggle(element, originalText) {
  const pseudoText = await convertToPseudoJapanese(originalText);
  const button = document.createElement("button");
  button.className = "language-toggle";
  button.textContent = "日本語風 / English";

  let showingPseudo = false;
  button.addEventListener("click", () => {
    element.style.transition = "opacity 200ms";
    element.style.opacity = "0";
    setTimeout(() => {
      element.textContent = showingPseudo ? originalText : pseudoText;
      element.style.opacity = "1";
      showingPseudo = !showingPseudo;
    }, 200);
  });

  return button;
}
