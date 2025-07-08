import { fetchJson } from "./dataUtils.js";
import { createGokyoLookup } from "./utils.js";
import { generateJudokaCardHTML } from "./cardBuilder.js";
import { getRandomJudoka } from "./cardUtils.js";
import { hasRequiredJudokaFields } from "./judokaValidation.js";
import { DATA_DIR } from "./constants.js";

/**
 * Builds a simple fallback judoka object used when data fails to load.
 *
 * @pseudocode
 * 1. Create an object with minimal judoka information.
 *    - Use neutral stats and placeholder text.
 * 2. Return this object for use in fallback card generation.
 *
 * @returns {Judoka} The fallback judoka data.
 */
export function buildFallbackJudoka() {
  return {
    id: 0,
    firstname: "Unknown",
    surname: "Judoka",
    country: "Unknown",
    countryCode: "N/A",
    stats: {
      power: 0,
      speed: 0,
      technique: 0,
      kumikata: 0,
      newaza: 0
    },
    weightClass: "N/A",
    signatureMoveId: 0,
    rarity: "common"
  };
}

/**
 * Replaces the contents of an element with the given card and animates it.
 *
 * @pseudocode
 * 1. Exit early if `element` or `card` is missing.
 * 2. Clear `element` and append `card` to it.
 * 3. If motion is allowed, add the `animate-card` class on the next frame.
 *
 * @param {HTMLElement} element - DOM element to contain the card.
 * @param {HTMLElement} card - The card element to display.
 * @param {boolean} [prefersMotion=false] - Whether to animate the card.
 */
export function displayCard(element, card, prefersMotion = false) {
  if (!element || !card) return;
  element.innerHTML = "";
  element.appendChild(card);
  if (!prefersMotion) {
    requestAnimationFrame(() => {
      card.classList.add("animate-card");
    });
  }
}

/**
 * Creates and displays a card for the specified judoka.
 *
 * @pseudocode
 * 1. Generate the HTML for `judoka` using `generateJudokaCardHTML`.
 * 2. When a card element is returned, display it with `displayCard`.
 *
 * @param {Judoka} judoka - Judoka data used to build the card.
 * @param {Object<string, GokyoEntry>} gokyoLookup - Lookup of gokyo moves.
 * @param {HTMLElement} containerEl - Element to contain the card.
 * @param {boolean} prefersReducedMotion - Motion preference flag.
 * @returns {Promise<void>} Resolves when the card is displayed.
 */
export async function createCardForJudoka(judoka, gokyoLookup, containerEl, prefersReducedMotion) {
  const card = await generateJudokaCardHTML(judoka, gokyoLookup);
  if (card) {
    displayCard(containerEl, card, prefersReducedMotion);
  }
}

/**
 * Generates a random judoka card and appends it to a container element.
 *
 * @pseudocode
 * 1. Ensure judoka data is available:
 *    - If `activeCards` is undefined, fetch `judoka.json` and filter out hidden
 *      or incomplete entries.
 * 2. Ensure gokyo data is available:
 *    - Use the provided `gokyoData` or fetch `gokyo.json`.
 *    - Create a lookup object with `createGokyoLookup`.
 * 3. Select a random judoka using `getRandomJudoka`.
 * 4. Generate and display the card with `createCardForJudoka`.
 * 5. On any error, log the issue and display a fallback card (judoka id `0`).
 *
 * @param {Judoka[]} [activeCards] - Preloaded judoka data.
 * @param {GokyoEntry[]} [gokyoData] - Preloaded gokyo data.
 * @param {HTMLElement} containerEl - Element to contain the card.
 * @param {boolean} [prefersReducedMotion=false] - Motion preference flag.
 * @returns {Promise<void>} Resolves when the card is appended.
 */
export async function generateRandomCard(
  activeCards,
  gokyoData,
  containerEl,
  prefersReducedMotion = false
) {
  if (!containerEl) return;

  let gokyoLookup = {};
  try {
    const gokyo = gokyoData || (await fetchJson(`${DATA_DIR}gokyo.json`));
    gokyoLookup = createGokyoLookup(gokyo);
  } catch (gokyoError) {
    console.error("Error loading gokyo data:", gokyoError);
  }

  try {
    const judokaData = activeCards || (await fetchJson(`${DATA_DIR}judoka.json`));

    const validJudoka = Array.isArray(judokaData)
      ? judokaData.filter((j) => !j.isHidden && hasRequiredJudokaFields(j))
      : [];

    if (validJudoka.length === 0) {
      throw new Error("No valid judoka entries found");
    }

    const selectedJudoka = getRandomJudoka(validJudoka);
    await createCardForJudoka(selectedJudoka, gokyoLookup, containerEl, prefersReducedMotion);
    // else: do not update DOM if card is null/undefined
  } catch (error) {
    console.error("Error generating random card:", error);

    const fallbackJudoka = buildFallbackJudoka();

    try {
      await createCardForJudoka(fallbackJudoka, gokyoLookup, containerEl, prefersReducedMotion);
    } catch (fallbackError) {
      console.error("Error displaying fallback card:", fallbackError);
      // Do not update DOM if fallback also fails
    }
  }
}
