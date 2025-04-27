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
  const requiredFields = ["firstname", "surname", "country", "stats", "weightClass"];
  const missingFields = requiredFields.filter((field) => !judoka[field]);

  if (missingFields.length > 0) {
    throw new Error(`Invalid Judoka object: Missing required fields: ${missingFields.join(", ")}`);
  }
}

/**
 * Generates the complete HTML for a judoka card.
 * 
 * Pseudocode:
 * 1. Validate the `judoka` object to ensure all required fields are present.
 *    - If validation fails, throw an error.
 * 
 * 2. Generate the flag URL for the judoka's country using `getFlagUrl`.
 * 
 * 3. Format the `lastUpdated` date:
 *    - If it's a string, use it as-is.
 *    - If it's a Date object, convert it to a string in "YYYY-MM-DD" format.
 *    - If it's undefined, use an empty string.
 * 
 * 4. Generate the complete HTML for the judoka card:
 *    - Include the top bar HTML.
 *    - Include the top bar, portrait, stats, signature move, and last updated sections.
 * 
 * 5. Return the complete HTML string.
 * 
 * @param {Object} judoka - The judoka object.
 * @param {Array} gokyo - The array of Gokyo entries (techniques).
 * @returns {string} The complete HTML string for the judoka card.
 */
export async function generateJudokaCardHTML(judoka, gokyo) {
  // Validate the Judoka object
  validateJudoka(judoka);

  // Generate the flag URL
  const flagUrl = getFlagUrl(judoka.country);

  // Ensure lastUpdated is a string before passing it to formatDate
  const lastUpdated =
    typeof judoka.lastUpdated === "string"
      ? judoka.lastUpdated
      : judoka.lastUpdated?.toISOString().split("T")[0] || "";

  // Await the top bar HTML
  const topBarHtml = await generateCardTopBar(judoka, flagUrl);
  console.log("Generated card HTML:", topBar.html);

  // Generate the complete HTML
  return `
    <div class="card-container">
      <div class="judoka-card">
        ${generateCardTopBar(judoka, flagUrl)}
        ${generateCardPortrait(judoka)}
        ${generateCardStats(judoka)}
        ${generateCardSignatureMove(judoka, gokyo)}
        ${generateCardLastUpdated(lastUpdated)}
      </div>
    </div>
  `;
}