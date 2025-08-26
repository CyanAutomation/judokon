import { fetchJson } from "./dataUtils.js";
import { createGokyoLookup } from "./utils.js";
import { getRandomJudoka } from "./cardUtils.js";
import { hasRequiredJudokaFields } from "./judokaValidation.js";
import { DATA_DIR } from "./constants.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { JudokaCard } from "../components/JudokaCard.js";
import { setupLazyPortraits } from "./lazyPortrait.js";
import { markSignatureMoveReady } from "./signatureMove.js";

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
 * @param {boolean} [skipAnimation=false] - Skip the entry animation when true.
 * @private
 */
function displayCard(element, card, skipAnimation = false) {
  if (!element || !card) return;
  element.innerHTML = "";
  element.appendChild(card);
  if (card.querySelector(".signature-move-container")) {
    markSignatureMoveReady();
  }
  setupLazyPortraits(card);
  if (!skipAnimation) {
    requestAnimationFrame(() => {
      card.classList.add("animate-card");
    });
  }
}

/**
 * Creates and displays a card for the specified judoka.
 *
 * @pseudocode
 * 1. Build a card for `judoka` using the `JudokaCard` component.
 * 2. When a card element is returned, display it with `displayCard`.
 *
 * @param {Judoka} judoka - Judoka data used to build the card.
 * @param {Object<string, GokyoEntry>} gokyoLookup - Lookup of gokyo moves.
 * @param {HTMLElement} containerEl - Element to contain the card.
 * @param {boolean} prefersReducedMotion - Motion preference flag.
 * @returns {Promise<void>} Resolves when the card is displayed.
 * @private
 */
async function createCardForJudoka(judoka, gokyoLookup, containerEl, prefersReducedMotion) {
  const card = await new JudokaCard(judoka, gokyoLookup).render();
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
 *    - On failure, build a minimal lookup and notify the user.
 * 3. Select a random judoka using `getRandomJudoka` and invoke `onSelect`
 *    with the chosen judoka when provided.
 * 4. Generate and display the card with `createCardForJudoka`.
 * 5. On any error, log the issue and load the fallback judoka using
 *    `getFallbackJudoka()`, then display its card and log any display error.
 *
 * @param {Judoka[]} [activeCards] - Preloaded judoka data.
 * @param {GokyoEntry[]} [gokyoData] - Preloaded gokyo data.
 * @param {HTMLElement} containerEl - Element to contain the card.
 * @param {boolean} [prefersReducedMotion=false] - Motion preference flag.
 * @param {function} [onSelect] - Callback invoked with the chosen judoka.
 * @returns {Promise<void>} Resolves when the card is appended.
 */
export async function generateRandomCard(
  activeCards,
  gokyoData,
  containerEl,
  prefersReducedMotion = false,
  onSelect,
  options = {}
) {
  if (!containerEl) return;

  let gokyoLookup = {};
  try {
    const gokyo = gokyoData || (await fetchJson(`${DATA_DIR}gokyo.json`));
    gokyoLookup = createGokyoLookup(gokyo);
  } catch (gokyoError) {
    console.error("Error loading gokyo data:", gokyoError);
    gokyoLookup = createGokyoLookup([{ id: 0, name: "Jigoku-guruma" }]);
    try {
      const { showSnackbar } = await import("./showSnackbar.js");
      showSnackbar("Move list unavailable; using fallback data");
    } catch (notifyError) {
      console.warn("Unable to notify about missing gokyo data:", notifyError);
    }
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
    if (typeof onSelect === "function") {
      onSelect(selectedJudoka);
    }
    const card = await new JudokaCard(selectedJudoka, gokyoLookup, {
      enableInspector: options.enableInspector
    }).render();
    if (card) {
      displayCard(containerEl, card, prefersReducedMotion);
    }
  } catch (error) {
    console.error("Error generating random card:", error);

    const fallbackJudoka = await getFallbackJudoka();
    if (typeof onSelect === "function") {
      onSelect(fallbackJudoka);
    }
    try {
      await createCardForJudoka(fallbackJudoka, gokyoLookup, containerEl, prefersReducedMotion);
    } catch (fallbackError) {
      console.error("Error displaying fallback card:", fallbackError);
    }
  }
}
