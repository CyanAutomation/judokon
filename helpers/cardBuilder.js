import { formatDate, escapeHTML, getValue } from "./utils.js";
import { getFlagUrl } from "./countryUtils.js";
import { generateCardTopBar } from "./cardTopBar.js";
import { generateCardPortrait, generateCardStats, generateCardSignatureMove } from "./cardRender.js";

/**
 * Generates the "last updated" HTML for a judoka card.
 * @param {string|Date|undefined} date - The last updated date as a string or Date.
 * @returns {string} The HTML string for the "last updated" section.
 */
function generateCardLastUpdated(date) {
  if (!date) return ""; // If date is undefined, don't render anything
  const safeDate = date instanceof Date ? date.toISOString().split("T")[0] : date;
  return `<div class="card-updated">Last updated: ${escapeHTML(safeDate)}</div>`;
}

/**
 * Validates the required fields of a Judoka object.
 * @param {Object} judoka - The judoka object to validate.
 * @throws {Error} If required fields are missing.
 */
function validateJudoka(judoka) {
  if (!judoka.name || !judoka.surname || !judoka.country) {
    throw new Error("Invalid Judoka object: Missing required fields.");
  }
}

/**
 * Generates the complete HTML for a judoka card.
 * @param {Object} judoka - The judoka object.
 * @param {Array} gokyo - The array of Gokyo entries (techniques).
 * @returns {string} The complete HTML string for the judoka card.
 */
export function generateJudokaCardHTML(judoka, gokyo) {
  // Validate the Judoka object
  validateJudoka(judoka);

  // Generate the flag URL
  const flagUrl = getFlagUrl(judoka.country);

  // Ensure lastUpdated is a string before passing it to formatDate
  const lastUpdated =
    typeof judoka.lastUpdated === "string"
      ? judoka.lastUpdated
      : judoka.lastUpdated?.toISOString().split("T")[0] || "";

  // Generate the complete HTML
  return `
    <div class="card-container">
      <div class="judoka-card">
        ${generateCardTopBar(judoka, flagUrl).html}
        ${generateCardPortrait(judoka)}
        ${generateCardStats(judoka)}
        ${generateCardSignatureMove(judoka, gokyo)}
        ${generateCardLastUpdated(lastUpdated)}
      </div>
    </div>
  `;
}