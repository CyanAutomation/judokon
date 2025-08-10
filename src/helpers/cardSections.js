import {
  generateCardPortrait,
  generateCardSignatureMove,
  generateCardStats
} from "./cardRender.js";
import { generateCardTopBar, createNoDataContainer } from "./cardTopBar.js";
import { safeGenerate } from "./errorUtils.js";

/**
 * Build the top bar section for a judoka card.
 *
 * @pseudocode
 * 1. Generate the top bar with `safeGenerate(generateCardTopBar)`.
 *    - On failure, return `createNoDataContainer()`.
 * 2. Return the resulting element.
 *
 * @param {import("./types.js").Judoka} judoka - Judoka data object.
 * @param {string} flagUrl - URL of the country flag.
 * @returns {Promise<HTMLElement>} Top bar element.
 */
export async function createTopBarSection(judoka, flagUrl) {
  return await safeGenerate(
    () => generateCardTopBar(judoka, flagUrl),
    "Failed to generate top bar:",
    createNoDataContainer()
  );
}

/**
 * Build the portrait section for a judoka card.
 *
 * @pseudocode
 * 1. Generate portrait HTML with `generateCardPortrait(judoka)`.
 * 2. Convert the HTML to a fragment and grab the first element.
 * 3. Create a `<div>` showing the judoka's weight class, add the tooltip id,
 *    and append it.
 * 4. Return the resulting element.
 * 5. On failure, log the error and return `createNoDataContainer()`.
 *
 * @param {import("./types.js").Judoka} judoka - Judoka data object.
 * @returns {HTMLElement} Portrait element.
 */
export function createPortraitSection(judoka) {
  try {
    const fragment = document.createRange().createContextualFragment(generateCardPortrait(judoka));
    const portraitElement = fragment.firstElementChild;

    const weightClassElement = document.createElement("div");
    weightClassElement.className = "card-weight-class";
    weightClassElement.dataset.tooltipId = "card.weightClass";
    weightClassElement.textContent = judoka.weightClass;
    portraitElement.appendChild(weightClassElement);

    return portraitElement;
  } catch (error) {
    console.error("Failed to generate portrait:", error);
    return createNoDataContainer();
  }
}

/**
 * Build the stats section for a judoka card.
 *
 * @pseudocode
 * 1. Call `generateCardStats(judoka, cardType)` to get stats HTML.
 * 2. Parse the HTML into a fragment and return its first element.
 * 3. On error, log and return `createNoDataContainer()`.
 *
 * @param {import("./types.js").Judoka} judoka - Judoka data object.
 * @param {string} cardType - Card rarity type.
 * @returns {HTMLElement} Stats panel element.
 */
export async function createStatsSection(judoka, cardType) {
  try {
    const statsHTML = await generateCardStats(judoka, cardType);
    const fragment = document.createRange().createContextualFragment(statsHTML);
    return fragment.firstElementChild;
  } catch (error) {
    console.error("Failed to generate stats:", error);
    return createNoDataContainer();
  }
}

/**
 * Build the signature move section for a judoka card.
 *
 * @pseudocode
 * 1. Generate signature move HTML via `generateCardSignatureMove`.
 * 2. Parse the HTML into a fragment and return its first element.
 * 3. On error, log and return `createNoDataContainer()`.
 *
 * @param {import("./types.js").Judoka} judoka - Judoka data object.
 * @param {Record<number, import("./types.js").GokyoEntry>} gokyoLookup - Move lookup.
 * @param {string} cardType - Card rarity type.
 * @returns {HTMLElement} Signature move element.
 */
export function createSignatureMoveSection(judoka, gokyoLookup, cardType) {
  try {
    const signatureMoveHTML = generateCardSignatureMove(judoka, gokyoLookup, cardType);
    const fragment = document.createRange().createContextualFragment(signatureMoveHTML);
    return fragment.firstElementChild;
  } catch (error) {
    console.error("Failed to generate signature move:", error);
    return createNoDataContainer();
  }
}

export const cardSectionRegistry = [
  async (judoka, { flagUrl }) => await createTopBarSection(judoka, flagUrl),
  (judoka) => createPortraitSection(judoka),
  async (judoka, { cardType }) => await createStatsSection(judoka, cardType),
  (judoka, { gokyoLookup, cardType }) => createSignatureMoveSection(judoka, gokyoLookup, cardType)
];
