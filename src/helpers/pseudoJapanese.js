import { DATA_DIR } from "./constants.js";
import { fetchJson } from "./dataUtils.js";

const STATIC_FALLBACK = "\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8"; // 日本語風テキスト
let converterPromise;

async function loadConverter() {
  if (!converterPromise) {
    converterPromise = fetchJson(`${DATA_DIR}japaneseConverter.json`).catch(() => null);
  }
  return converterPromise;
}

/**
 * Convert English text to pseudo-Japanese using a JSON lookup table.
 *
 * @pseudocode
 * 1. If input is null, undefined, or empty string, return empty string.
 * 2. Load the converter JSON once using `loadConverter`.
 *    - If loading fails, return `STATIC_FALLBACK`.
 * 3. Clean the `text` by removing characters other than letters, numbers, and whitespace.
 * 4. Build a list of fallback characters from the mapping values.
 * 5. If the cleaned text contains only digits and whitespace, return an empty
 *    string.
 * 6. For each character in the cleaned text:
 *    - Preserve whitespace characters as-is.
 *    - Map letters (case-insensitive) using the converter table when possible.
 *    - Replace digits and unmapped letters with a random fallback character.
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
        return letters[Math.floor(Math.random() * letters.length)];
      }

      // digits or unmapped letters
      return fallbackChars[Math.floor(Math.random() * fallbackChars.length)];
    })
    .join("");
}

/**
 * Convert all text nodes within an element to pseudo-Japanese while
 * preserving the original HTML structure.
 *
 * @pseudocode
 * 1. Traverse the element with a `TreeWalker` to collect all text nodes.
 * 2. For each text node, asynchronously convert its value using
 *    `convertToPseudoJapanese`.
 * 3. Wait for all conversions to finish.
 * 4. Replace each text node's value with the corresponding converted text.
 *
 * @param {HTMLElement} element - The element containing text to convert.
 * @returns {Promise<void>} Resolves when conversion is complete.
 */
export async function convertElementToPseudoJapanese(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  const results = await Promise.allSettled(
    nodes.map((node) => convertToPseudoJapanese(node.nodeValue))
  );
  nodes.forEach((node, idx) => {
    if (results[idx].status === "fulfilled") {
      node.nodeValue = results[idx].value;
    } else {
      console.error(`Failed to convert text node: ${results[idx].reason}`);
      node.nodeValue = node.nodeValue || STATIC_FALLBACK; // Fallback to original or static text
    }
  });
}

/**
 * Create a button that toggles an element's text between English and pseudo-Japanese.
 *
 * @pseudocode
 * 1. Find the existing button with id `language-toggle`.
 * 2. Attach a click handler that fades out the element and then:
 *    - On the first click, cache the element's HTML and convert all
 *      text nodes using `convertElementToPseudoJapanese`.
 *    - Swap between the cached original HTML and the generated
 *      pseudo-Japanese HTML while toggling a Japanese font class.
 *    - Fade the element back in after the swap completes.
 * 3. Return the button so callers can further manipulate it if needed.
 *
 * @param {HTMLElement} element - The element whose text will be toggled.
 * @returns {HTMLButtonElement|null} The toggle button if found, otherwise `null`.
 */
export function setupLanguageToggle(element) {
  const button = document.getElementById("language-toggle");
  if (!button) {
    return null;
  }

  let originalHTML = "";
  let pseudoHTML = "";
  let pseudoLoaded = false;
  let showingPseudo = false;

  button.addEventListener("click", () => {
    element.style.transition = "opacity 200ms";
    element.style.opacity = "0";
    setTimeout(async () => {
      if (showingPseudo) {
        element.innerHTML = originalHTML;
      } else {
        if (!pseudoLoaded) {
          originalHTML = element.innerHTML;
          const clone = element.cloneNode(true);
          await convertElementToPseudoJapanese(clone);
          pseudoHTML = clone.innerHTML;
          pseudoLoaded = true;
        }
        element.innerHTML = pseudoHTML;
      }
      element.classList.toggle("jp-font", !showingPseudo);
      element.style.opacity = "1";
      showingPseudo = !showingPseudo;
    }, 200);
  });

  return button;
}
