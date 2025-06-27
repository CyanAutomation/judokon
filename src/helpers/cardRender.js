/**
 * Generates the portrait HTML for a judoka card.
 *
 * @pseudocode
 * 1. Validate the input card object:
 *    - Ensure the card is an object and contains required fields (`id`, `firstname`, `surname`).
 *    - Throw an error if validation fails.
 *
 * 2. Extract judoka details (`id`, `firstname`, `surname`) from the card object.
 *
 * 3. Construct the portrait HTML:
 *    - Create a `<div>` element with the class `card-portrait`.
 *    - Add an `<img>` element:
 *      a. Set the `src` attribute to the portrait URL based on `id`.
 *      b. Set the `alt` attribute to include the judoka's name.
 *      c. Add an `onerror` handler to fallback to the placeholder portrait (id 0) if the image fails to load.
 *
 * 4. Return the constructed HTML string.
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
  return `
    <div class="card-portrait">
      <img src="../assets/judokaPortraits/judokaPortrait-${id}.png" alt="${firstname} ${surname}'s portrait" loading="lazy" onerror="this.src='../assets/judokaPortraits/judokaPortrait-0.png'">
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
 *
 * 3. Construct the stats HTML:
 *    - Create a `<div>` element with the class `card-stats` and the card type as an additional class.
 *    - Add a `<ul>` element containing `<li>` items for each stat:
 *      a. Include the stat name in bold.
 *      b. Include the stat value inside a `<span>` element.
 *
 * 4. Return the constructed HTML string.
 *
 * @param {JudokaCard} card - The card data containing the judoka and signature move.
 * @param {string} cardType - The type of card (e.g., "common", "rare").
 * @returns {string} The HTML string for the stats.
 */
export function generateCardStats(card, cardType = "common") {
  if (!card || typeof card !== "object") {
    throw new Error("Card object is required");
  }

  if (!card.stats || typeof card.stats !== "object") {
    throw new Error("Stats object is required");
  }

  const { power = "?", speed = "?", technique = "?", kumikata = "?", newaza = "?" } = card.stats;

  return `
    <div class="card-stats ${cardType}">
      <ul>
        <li class="stat"><strong>Power</strong> <span>${power}</span></li>
        <li class="stat"><strong>Speed</strong> <span>${speed}</span></li>
        <li class="stat"><strong>Technique</strong> <span>${technique}</span></li>
        <li class="stat"><strong>Kumi-kata</strong> <span>${kumikata}</span></li>
        <li class="stat"><strong>Ne-waza</strong> <span>${newaza}</span></li>
      </ul>
    </div>
  `;
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
 *    - Fallback to the default technique (`id: 0`) if no match is found.
 *
 * 3. Escape the technique name to prevent XSS.
 *
 * 4. Construct the signature move HTML:
 *    - Create a `<div>` element with the class `signature-move-container` and the card type as an additional class.
 *    - Add `<span>` elements for the label ("Signature Move:") and the escaped technique name.
 *
 * 5. Return the constructed HTML string.
 *
 * @param {Object} judoka - The judoka object containing the signatureMoveId.
 * @param {Object} gokyoLookup - The lookup object for techniques.
 * @param {string} cardType - The type of card (e.g., "common", "rare").
 * @returns {string} The HTML string for the signature move.
 */
import { escapeHTML } from "./utils.js";
import { debugLog } from "./debug.js";

export function generateCardSignatureMove(judoka, gokyoLookup, cardType = "common") {
  // Handle null or undefined judoka
  if (!judoka) {
    judoka = {}; // Default to an empty object
  }

  const signatureMoveId = Number(judoka.signatureMoveId ?? 0); // Ensure signatureMoveId is a number

  debugLog("Signature Move ID:", signatureMoveId);
  debugLog("Judoka Object:", judoka);
  debugLog("Gokyo Lookup Object:", gokyoLookup);

  const technique = (gokyoLookup && gokyoLookup[signatureMoveId]) ||
    (gokyoLookup && gokyoLookup[0]) || { id: 0, name: "Jigoku-guruma" };

  const techniqueName = technique?.name || "Jigoku-guruma";

  // Escape the technique name to prevent XSS
  const escapedTechniqueName = escapeHTML(techniqueName);

  debugLog("Selected Technique:", technique);

  const cardClass = cardType.toLowerCase();

  return `
    <div class="signature-move-container ${cardClass}">
      <span class="signature-move-label">Signature Move:</span>
      <span class="signature-move-value">${escapedTechniqueName}</span>
    </div>
  `;
}
