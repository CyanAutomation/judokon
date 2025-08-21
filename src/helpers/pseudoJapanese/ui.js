import { convertToPseudoJapanese, STATIC_FALLBACK } from "./converter.js";

/**
 * Convert all text nodes within an element to pseudo-Japanese while
 * preserving the original HTML structure.
 *
 * @pseudocode
 * 1. If `element` is `null` or `undefined`, return immediately.
 * 2. Traverse the element with a `TreeWalker` to collect all text nodes.
 * 3. For each text node, asynchronously convert its value using
 *    `convertToPseudoJapanese`.
 * 4. Wait for all conversions to finish.
 * 5. Replace each text node's value with the corresponding converted text.
 *
 * @param {HTMLElement} element - The element containing text to convert.
 * @returns {Promise<void>} Resolves when conversion is complete.
 */
export async function convertElementToPseudoJapanese(element) {
  if (!element) return;

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
 * 2. Attach a click handler that adds a `fading` class to the element
 *    to fade it out, then:
 *    - On the first click, cache the element's HTML and convert all
 *      text nodes using `convertElementToPseudoJapanese`.
 *    - Swap between the cached original HTML and the generated
 *      pseudo-Japanese HTML while toggling a Japanese font class.
 *    - Remove the `fading` class so the element fades back in.
 *    - If an error occurs, log it and remove the `fading` class to
 *      reset the UI.
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

  element.classList.add("fade-transition");

  let originalHTML = "";
  let pseudoHTML = "";
  let pseudoLoaded = false;
  let showingPseudo = false;

  button.addEventListener("click", () => {
    element.classList.add("fading");
    setTimeout(async () => {
      try {
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
        element.classList.remove("fading");
        showingPseudo = !showingPseudo;
      } catch (error) {
        console.error(error);
        element.classList.remove("fading");
      }
    }, 200);
  });

  return button;
}
