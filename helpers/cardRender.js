import { getValue } from "./utils.js";

const PLACEHOLDER_PORTRAIT = "./assets/judokaPortraits/judokaPortrait-0.png";

/**
 * Generates the portrait HTML for a judoka card.
 *
 * Pseudocode:
 * 1. Determine the portrait URL:
 *    - If the JUDOKA object exists and has a valid id, construct the URL using the id (e.g., ./assets/judokaPortraits/judokaPortrait-{id}.png).
 *    - Otherwise, use the PLACEHOLDER_PORTRAIT as the default URL.
 *
 * 2. Construct the HTML for the portrait:
 *    - Create a <div> element with the class CARD-PORTRAIT.
 *    - Inside the <div>, add an <img> element:
 *      a. Set the SRC attribute to the determined portrait URL.
 *      b. Set the ALT attribute to include the judoka's FIRSTNAME and SURNAME (fallback to "Judoka" if FIRSTNAME is missing).
 *      c. Add an ONERROR handler to replace the image with the PLACEHOLDER_PORTRAIT if the image fails to load.
 *
 * 3. Return the constructed HTML string.
 *
 * @param {JudokaCard} card - The card data containing the judoka and signature move.
 * @returns {string} The HTML string for the portrait.
 */
export function generateCardPortrait(card) {
  const { judoka } = card;
  const portraitUrl =
    judoka && judoka.id
      ? `./assets/judokaPortraits/judokaPortrait-${judoka.id}.png`
      : PLACEHOLDER_PORTRAIT;

  return `
    <div class="card-portrait">
      <img src="${portraitUrl}" alt="${getValue(judoka?.firstname, "Judoka")} ${getValue(
        judoka?.surname,
        ""
      )}'s portrait" onerror="this.src='${PLACEHOLDER_PORTRAIT}'">
    </div>
  `;
}

/**
 * Generates the stats HTML for a judoka card.
 *
 * Pseudocode:
 * 1. Check if the JUDOKA object has a STATS property:
 *    - If STATS is missing or falsy, return a <div> element with the text "No stats available".
 *
 * 2. Extract the stats from the JUDOKA.STATS object:
 *    - Use destructuring to get POWER, SPEED, TECHNIQUE, KUMIKATA, and NEWAZA.
 *    - If any of these values are missing, default them to "?".
 *
 * 3. Construct the HTML for the stats:
 *    - Create a <div> element with the class CARD-STATS.
 *    - Inside the <div>, create an unordered list (<ul>).
 *    - Add list items (<li>) for each stat:
 *      a. Include the stat name (e.g., "Power") in bold.
 *      b. Include the stat value inside a <span> element.
 *
 * 4. Return the constructed HTML string.
 *
 * @param {JudokaCard} card - The card data containing the judoka and signature move.
 * @returns {string} The HTML string for the stats.
 */
export function generateCardStats(card) {
  const { judoka } = card;
  if (!judoka?.stats) return '<div class="card-stats">No stats available</div>';
  const { power = "?", speed = "?", technique = "?", kumikata = "?", newaza = "?" } = judoka.stats;
  return `
    <div class="card-stats">
      <ul>
        <li class="stat"><strong>Power:</strong> <span>${power}</span></li>
        <li class="stat"><strong>Speed:</strong> <span>${speed}</span></li>
        <li class="stat"><strong>Technique:</strong> <span>${technique}</span></li>
        <li class="stat"><strong>Kumi-kata:</strong> <span>${kumikata}</span></li>
        <li class="stat"><strong>Ne-waza:</strong> <span>${newaza}</span></li>
      </ul>
    </div>
  `;
}

/**
 * Pseudocode:
 * 1. Extract the `signatureMoveId` from the `judoka` object:
 *    - If `judoka` is null or undefined, default `signatureMoveId` to 0.
 *
 * 2. Validate the `gokyo` array and search for a matching technique:
 *    - Check if `gokyo` is an array.
 *    - Use the `find` method to locate a technique where:
 *      a. The `id` matches `signatureMoveId`.
 *      b. The `name` property exists.
 *    - If no matching technique is found, `technique` will be `null`.
 *
 * 3. Extract the technique name:
 *    - If a valid `technique` is found, use its `name` property.
 *    - Since "Unknown" is guaranteed in `gokyo.json` for `id: 0`, no fallback is needed.
 *
 * 4. Construct the HTML for the signature move:
 *    - Create a `<div>` element with the class `card-signature`.
 *    - Add a `<span>` element with the label "Signature Move:" in bold.
 *    - Add another `<span>` element with the technique name.
 *
 * 5. Return the constructed HTML string.
 *
 * @param {JudokaCard} card - The card data containing the judoka and signature move.
 * @param {Array<GokyoEntry>} gokyo - The array of techniques.
 * @returns {string} The HTML string for the signature move.
 */
export function generateCardSignatureMove(card, gokyo) {
  // Safeguard against null or undefined card
  if (!card) {
    return `
      <div class="card-signature">
        <span class="signature-move-label"><strong>Signature Move:</strong></span>
        <span class="signature-move-value">Unknown</span>
      </div>
    `;
  }

  const { judoka } = card;
  const signatureMoveId = Number(judoka?.signatureMoveId ?? 0); // Ensure signatureMoveId is a number

  // Ensure gokyo is an array and find a valid technique
  let technique = Array.isArray(gokyo)
    ? gokyo.find((move) => Number(move.id) === signatureMoveId) // Compare as numbers
    : null;

  // Fallback to id=0 if no match is found
  if (!technique && Array.isArray(gokyo)) {
    technique = gokyo.find((move) => Number(move.id) === 0);
  }

  const techniqueName = technique?.name || "Unknown"; // Fallback to "Unknown" if no technique is found
  return `
    <div class="card-signature">
      <span class="signature-move-label"><strong>Signature Move:</strong></span>
      <span class="signature-move-value">${techniqueName}</span>
    </div>
  `;
}
