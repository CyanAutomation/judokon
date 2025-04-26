import { getValue } from "./utils.js";

const PLACEHOLDER_PORTRAIT = "./assets/judokaPortraits/judokaPortrait-0.png";

/**
 * Generates the portrait HTML for a judoka card.
 * @param {Object|null|undefined} judoka - The judoka object.
 * @returns {string} The HTML string for the portrait.
 */
export function generateCardPortrait(judoka) {
  const portraitUrl =
    judoka && judoka.id ? `./assets/judokaPortraits/judokaPortrait-${judoka.id}.png` : PLACEHOLDER_PORTRAIT;

  return `
    <div class="card-portrait">
      <img src="${portraitUrl}" alt="${getValue(judoka?.name, "Judoka")} ${getValue(
        judoka?.surname,
        "",
      )}'s portrait" onerror="this.src='${PLACEHOLDER_PORTRAIT}'">
    </div>
  `;
}

/**
 * Generates the stats HTML for a judoka card.
 * @param {Object|null|undefined} judoka - The judoka object.
 * @returns {string} The HTML string for the stats.
 */
export function generateCardStats(judoka) {
  if (!judoka?.stats) return `<div class="card-stats">No stats available</div>`;
  const { power = "?", speed = "?", technique = "?", kumiKata = "?", neWaza = "?" } = judoka.stats;
  return `
    <div class="card-stats">
      <ul>
        <li class="stat"><strong>Power:</strong> <span>${power}</span></li>
        <li class="stat"><strong>Speed:</strong> <span>${speed}</span></li>
        <li class="stat"><strong>Technique:</strong> <span>${technique}</span></li>
        <li class="stat"><strong>Kumi-kata:</strong> <span>${kumiKata}</span></li>
        <li class="stat"><strong>Ne-waza:</strong> <span>${neWaza}</span></li>
      </ul>
    </div>
  `;
}

/**
 * Generates the signature move HTML for a judoka card.
 * @param {Object|null|undefined} judoka - The judoka object.
 * @param {Array|null|undefined} gokyo - The array of techniques.
 * @returns {string} The HTML string for the signature move.
 */
export function generateCardSignatureMove(judoka, gokyo) {
  const signatureMoveId = judoka?.signatureMoveId;
  const technique = Array.isArray(gokyo) ? gokyo.find((move) => move.id === signatureMoveId) : null;

  if (!technique) {
    console.warn(`No technique found for signatureMoveId: ${signatureMoveId}`);
  }

  const techniqueName = technique?.name ?? "Unknown";
  return `
    <div class="card-signature">
      <span class="signature-move-label"><strong>Signature Move:</strong></span>
      <span class="signature-move-value">${techniqueName}</span>
    </div>
  `;
}