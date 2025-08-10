import { getFlagUrl } from "./country/codes.js";
import { safeGenerate } from "./errorUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";
import { enableCardFlip } from "./cardFlip.js";
import { cardSectionRegistry } from "./cardSections.js";
import { createInspectorPanel } from "./inspector/createInspectorPanel.js";

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
 * 1. Validate `judoka` and `gokyoLookup`:
 *    - Throw when required fields are missing.
 * 2. Resolve the flag URL via `safeGenerate(getFlagUrl)`.
 * 3. Create container and inner card elements and apply gender styling.
 * 4. For each builder in `cardSectionRegistry`, generate and append the section.
 * 5. Enable flip interactivity with `enableCardFlip`.
 * 6. Append an inspector panel when `enableInspector` is true.
 * 7. Return the populated container.
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
 * 1. Generate the card HTML:
 *    - Use `safeGenerate` with `generateJudokaCardHTML` and a fallback of `null`.
 *
 * 2. Append the card to the container:
 *    - If a card is returned, append it to the DOM.
 *
 * 3. Handle errors:
 *    - Error logging is managed by `safeGenerate`.
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
    container.appendChild(card);
  }
  return card;
}
