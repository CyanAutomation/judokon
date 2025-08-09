// Constants
const PLACEHOLDER_ID = 0;

import { escapeHTML, decodeHTML } from "./utils.js";
import { createStatsPanel } from "../components/StatsPanel.js";

/**
 * Generates the portrait HTML for a judoka card.
 *
 * @pseudocode
 * 1. Validate the input card object:
 *    - Ensure the card is an object and contains required fields (`id`, `firstname`, `surname`).
 *    - Throw an error if validation fails.
 *
 * 2. Extract judoka details (`id`, `firstname`, `surname`) from the card object.
 *    - Escape `firstname` and `surname` using `escapeHTML`.
 *
 * 3. Construct the portrait HTML:
 *    - Create a `<div>` element with the class `card-portrait` (maintains 2:3 aspect ratio).
 *    - Add an `<img>` element:
 *      a. Set the `src` attribute to a generic placeholder portrait (id=1) for initial load.
 *      b. Store the real portrait URL in a `data-portrait-src` attribute for lazy loading.
 *      c. Set the `alt` attribute to include the escaped name for accessibility (see PRD: alt text required).
 *      d. Add an `onerror` handler to fallback to the silhouette placeholder (PLACEHOLDER_ID) if the image fails to load (see PRD: missing portrait fallback).
 *
 * 4. Return the constructed HTML string.
 *
 * @accessibility
 * - Portraits must have descriptive alt text.
 * - Placeholder silhouette is used for missing portraits.
 * - Portrait container maintains 2:3 aspect ratio for visual consistency.
 *
 * @param {JudokaCard} card - The card data containing the judoka and signature move.
 * @returns {string} The HTML string for the portrait.
 */
export function generateCardPortrait(card) {
  if (!card || typeof card !== "object") {
    throw new Error("Card object is required");
  }

  const requiredFields = ["id", "firstname", "surname"];
  const missingFields = requiredFields.filter(
    (field) => card[field] === undefined || card[field] === null
  );

  if (missingFields.length > 0) {
    throw new Error(`Card is missing required fields: ${missingFields.join(", ")}`);
  }

  const { id, firstname, surname } = card;
  const escapedFirstname = escapeHTML(firstname);
  const escapedSurname = escapeHTML(surname);
  const realSrc = `../assets/judokaPortraits/judokaPortrait-${id}.png`;
  return `
    <div class="card-portrait">
      <img src="../assets/judokaPortraits/judokaPortrait-1.png" data-portrait-src="${realSrc}" alt="${escapedFirstname} ${escapedSurname}" loading="lazy" onerror="this.onerror=null; this.src='../assets/judokaPortraits/judokaPortrait-${PLACEHOLDER_ID}.png'">
    </div>
  `;
}

/**
 * Generates the stats HTML for a judoka card.
 *
 * @pseudocode
 * 1. Validate the input card object:
 *    - Ensure the card is an object and contains a valid `stats` property.
 *    - Throw an error if validation fails.
 *
 * 2. Extract stats (`power`, `speed`, `technique`, `kumikata`, `newaza`) from the card object:
 *    - Default missing values to "?".
 *    - Cap each stat at 10 (see PRD: cap extreme stats).
 *    - Escape each stat value using `escapeHTML`.
 *    - If stats are corrupted (not a number or missing), display error message "Stats unavailable" (see PRD: error state).
 *
 * 3. Construct the stats HTML:
 *    - If stats are valid, create a `<div>` element with the class `card-stats` and the card type as an additional class.
 *    - Add a `<ul>` element containing `<li>` items for each stat:
 *      a. Include the stat name in bold.
 *      b. Include the stat value inside a `<span>` element.
 *    - If stats are unavailable, show error message instead of stats list.
 *
 * 4. Return the constructed HTML string.
 *
 * @accessibility
 * - Stats text must meet WCAG 2.1 AA contrast ratio (≥4.5:1).
 * - Stats area uses clear labels and values for screen readers.
 *
 * @param {JudokaCard} card - The card data containing the judoka and signature move.
 * @param {string} cardType - The type of card (e.g., "common", "rare").
 * @returns {string} The HTML string for the stats.
 */
export async function generateCardStats(card, cardType = "common") {
  if (!card || typeof card !== "object") {
    throw new Error("Card object is required");
  }

  if (!card.stats || typeof card.stats !== "object") {
    throw new Error("Stats object is required");
  }

  const panel = await createStatsPanel(card.stats, { type: cardType });
  return panel.outerHTML;
}

/**
 * Generates the signature move HTML for a judoka card.
 *
 * @pseudocode
 * 1. Validate the input `judoka` object:
 *    - Default `judoka` to an empty object if null or undefined.
 *    - Extract `signatureMoveId` and ensure it is a number.
 *
 * 2. Lookup the technique in the `gokyoLookup` object:
 *    - Use `signatureMoveId` to find the matching technique.
 *    - Fallback to the default technique (PLACEHOLDER_ID) if no match is found.
 *
 * 3. Decode any HTML entities and then escape the technique name to prevent XSS.
 *
 * 4. Construct the signature move HTML:
 *    - Create a `<div>` element with the class `signature-move-container` and the card type as an additional class.
 *    - Add a `data-tooltip-id="ui.signatureBar"` attribute for tooltip support.
 *    - Add `<span>` elements for the label ("Signature Move:") and the escaped technique name.
 *    - Ensure the band is at least 44px tall for touch accessibility (see PRD: touch target size).
 *
 * 5. Return the constructed HTML string.
 *
 * @accessibility
 * - Signature move band must be at least 44px tall for touch targets.
 * - Text must meet contrast requirements.
 *
 * @param {Object} judoka - The judoka object containing the signatureMoveId.
 * @param {Object} gokyoLookup - The lookup object for techniques.
 * @param {string} cardType - The type of card (e.g., "common", "rare").
 * @returns {string} The HTML string for the signature move.
 */
import { debugLog } from "./debug.js";

function resolveTechnique(judoka, gokyoLookup) {
  const safeJudoka = judoka ?? {};
  const id = Number(safeJudoka.signatureMoveId ?? PLACEHOLDER_ID);
  debugLog("Signature Move ID:", id);
  debugLog("Judoka Object:", safeJudoka);
  debugLog("Gokyo Lookup Object:", gokyoLookup);
  return (
    (gokyoLookup && gokyoLookup[id]) ||
    (gokyoLookup && gokyoLookup[PLACEHOLDER_ID]) || { id: PLACEHOLDER_ID, name: "Jigoku-guruma" }
  );
}

function formatTechniqueName(technique) {
  const fallback = "Jigoku-guruma";
  const foundName = technique?.name;
  if (!foundName) return escapeHTML(fallback);
  const decoded = decodeHTML(foundName).trim();
  return escapeHTML(decoded);
}

export function generateCardSignatureMove(judoka, gokyoLookup, cardType = "common") {
  const technique = resolveTechnique(judoka, gokyoLookup);
  debugLog("Selected Technique:", technique);
  const techniqueName = formatTechniqueName(technique);
  const cardClass = cardType.toLowerCase();
  return `
    <div class="signature-move-container ${cardClass}" data-tooltip-id="ui.signatureBar">
      <span class="signature-move-label">Signature Move:</span>
      <span class="signature-move-value">${techniqueName}</span>
    </div>
  `;
}
