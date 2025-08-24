import { getFlagUrl } from "./country/codes.js";
import { safeGenerate } from "./errorUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";
import { enableCardFlip } from "./cardFlip.js";
import { cardSectionRegistry } from "./cardSections.js";
import { createInspectorPanel } from "./inspector/createInspectorPanel.js";
import { markSignatureMoveReady } from "./signatureMove.js";

/**
 * Generates the "last updated" HTML for a judoka card.
 *
 * @pseudocode
 * 1. Check if the `date` parameter is provided:
 *    - If `date` is undefined or falsy, return an empty string.
 *
 * 2. Format the date:
 *    - If `date` is a `Date` object, convert it to "YYYY-MM-DD" format.
 *    - If `date` is a string, use it as-is.
 *
 * 3. Sanitize the date string to prevent XSS attacks:
 *    - Use the `escapeHTML` function to sanitize the date string.
 *
 * 4. Generate the HTML for the "last updated" section:
 *    - Wrap the sanitized date in a `<div>` with the class `card-updated`.
 *
 * @param {string|Date|undefined} date - The last updated date as a string or Date.
 * @returns {string} The HTML string for the "last updated" section.
 */
// function generateCardLastUpdated(date) {
//   if (!date) return ""; // If date is undefined, don't render anything
//   const safeDate = date instanceof Date ? date.toISOString().split("T")[0] : date;
//   return `<div class="card-updated">Last updated: ${escapeHTML(safeDate)}</div>`;
// }

/**
 * Build and return a DOM container for a judoka card.
 *
 * @pseudocode
 * 1. Destructure `enableInspector` from `options`, defaulting to `false`.
 * 2. Perform initial validation: If `judoka` or `gokyoLookup` are falsy, create a fallback `div` with "No data available" text and return it.
 * 3. Check for missing required fields in `judoka` using `getMissingJudokaFields()`.
 * 4. If `judoka` does not have all required fields (`!hasRequiredJudokaFields(judoka)`), throw an error listing the missing fields.
 * 5. Resolve the `flagUrl`:
 *    a. Get `countryCode` from `judoka`.
 *    b. Use `safeGenerate` to call `getFlagUrl(countryCode || "vu")`.
 *    c. Provide an error message "Failed to resolve flag URL:" and a fallback URL "https://flagcdn.com/w320/vu.png".
 * 6. Determine `cardType` based on `judoka.rarity` (converted to lowercase), defaulting to "common".
 * 7. Create the `cardContainer` (`div` with class "card-container").
 * 8. Attempt to stringify `judoka` and store it in `cardContainer.dataset.cardJson` for inspector use. Catch and ignore serialization errors.
 * 9. Create the `judokaCard` (`div` with class `judoka-card` and `cardType`).
 * 10. Set `judokaCard` attributes: `role="button"`, `tabindex="0"`, and `aria-label` using judoka's name.
 * 11. Determine `genderClass` ("female-card" or "male-card") based on `judoka.gender` and add it to `judokaCard.classList`.
 * 12. Iterate through each `buildSection` function in `cardSectionRegistry`:
 *     a. Asynchronously call `buildSection` with `judoka` and an options object containing `flagUrl`, `gokyoLookup`, and `cardType`.
 *     b. Append the returned `section` to `judokaCard`.
 * 13. Enable card flip interactivity on `judokaCard` using `enableCardFlip()`.
 * 14. Append `judokaCard` to `cardContainer`.
 * 15. If `enableInspector` is true:
 *     a. Create an `inspectorPanel` using `createInspectorPanel(cardContainer, judoka)`.
 *     b. Append `inspectorPanel` to `cardContainer`.
 * 16. Return the `cardContainer`.
 *
 * Validates the judoka data and gokyo lookup, generates DOM sections for the card, and assembles them into a single container. When either argument is missing, a fallback element labeled "No data available" is returned.
 *
 * @param {import("./types.js").Judoka} judoka - Judoka data with required fields such as names, country codes, stats and signatureMoveId.
 * @param {Record<number, import("./types.js").GokyoEntry>} gokyoLookup - Map of technique ids to technique details. Missing lookups result in fallback content.
 * @returns {HTMLElement} Container element containing the completed card.
 */
export async function generateJudokaCardHTML(judoka, gokyoLookup, options = {}) {
  const { enableInspector = false } = options;
  // Add null/undefined checks for judoka and gokyoLookup
  if (!judoka || !gokyoLookup) {
    const fallback = document.createElement("div");
    fallback.textContent = "No data available";
    return fallback;
  }

  const missing = getMissingJudokaFields(judoka);
  if (!hasRequiredJudokaFields(judoka)) {
    throw new Error(`Invalid Judoka object: Missing required fields: ${missing.join(", ")}`);
  }

  const countryCode = judoka.countryCode;
  const flagUrl = await safeGenerate(
    () => getFlagUrl(countryCode || "vu"),
    "Failed to resolve flag URL:",
    "https://flagcdn.com/w320/vu.png"
  );

  const cardType = judoka.rarity?.toLowerCase() || "common";

  const cardContainer = document.createElement("div");
  cardContainer.className = "card-container";
  try {
    cardContainer.dataset.cardJson = JSON.stringify(judoka);
  } catch {
    // Ignore serialization errors; inspector will render a fallback
  }

  const judokaCard = document.createElement("div");
  judokaCard.className = `judoka-card ${cardType}`;
  judokaCard.setAttribute("role", "button");
  judokaCard.setAttribute("tabindex", "0");
  judokaCard.setAttribute("aria-label", `${judoka.firstname} ${judoka.surname} card`);

  const genderClass = judoka.gender === "female" ? "female-card" : "male-card";
  judokaCard.classList.add(genderClass);

  for (const buildSection of cardSectionRegistry) {
    const section = await buildSection(judoka, { flagUrl, gokyoLookup, cardType });
    judokaCard.appendChild(section);
  }

  enableCardFlip(judokaCard);

  cardContainer.appendChild(judokaCard);

  if (enableInspector) {
    const panel = createInspectorPanel(cardContainer, judoka);
    cardContainer.appendChild(panel);
  }

  return cardContainer;
}

/**
 * Generates a single judoka card and appends it to the container.
 *
 * @pseudocode
 * 1. Asynchronously generate the `card` HTML element:
 *    a. Use `safeGenerate()` to call `generateJudokaCardHTML()` with the provided `judoka`, `gokyoLookup`, and `options`.
 *    b. Provide a descriptive error message including the judoka's first and last name.
 *    c. Specify `null` as the fallback value if `generateJudokaCardHTML` throws an error.
 * 2. If a `card` element is successfully returned:
 *    a. Check if the `card` contains an element with the class ".signature-move-container".
 *    b. If such an element exists, call `markSignatureMoveReady()` to perform any necessary actions related to the signature move.
 * 3. Return the generated `card` element (or `null` if generation failed).
 *
 * @param {Object} judoka - A judoka object containing data for the card.
 * @param {Object} gokyoLookup - A lookup object for gokyo data.
 * @param {HTMLElement} container - The container to append the card to.
 */
export async function generateJudokaCard(judoka, gokyoLookup, container, options = {}) {
  const card = await safeGenerate(
    () => generateJudokaCardHTML(judoka, gokyoLookup, options),
    `Error generating card for judoka: ${judoka.firstname} ${judoka.surname}`,
    null
  );
  if (card) {
    if (card.querySelector(".signature-move-container")) {
      markSignatureMoveReady();
    }
  }
  return card;
}
