import { getFlagUrl } from "./country/codes.js";
import { generateCardTopBar, createNoDataContainer } from "./cardTopBar.js";
import { safeGenerate } from "./errorUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";
import { enableCardFlip } from "./cardFlip.js";
import {
  createPortraitSection,
  createStatsSection,
  createSignatureMoveSection
} from "./cardSections.js";

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
 * Generates the complete DOM structure for a judoka card.
 *
 * @pseudocode
 * 1. Validate the `judoka` object:
 *    - Ensure all required fields are present using `hasRequiredJudokaFields`.
 *
 * 2. Generate the flag URL:
 *    - Call `safeGenerate` with `getFlagUrl` and the `countryCode`.
 *    - Default to "vu" if `countryCode` is missing.
 *    - Fallback to the Vanuatu flag when an error occurs.
 *
 * 3. Determine the card type:
 *    - Use the `rarity` field to set the card type (e.g., "common").
 *
 * 4. Create the main card container:
 *    - Initialize a `<div>` with the class `card-container`.
 *    - Create a child `<div>` with the class `judoka-card` and card type.
 *
 * 5. Add gender-specific styling:
 *    - Add a class based on the `gender` field ("female-card" or "male-card").
 *
 * 6. Append the top bar:
 *    - Generate the top bar using `generateCardTopBar` and append it.
 *    - If generation fails, append a "No data available" container instead.
 *
 * 7. Append the portrait section:
 *    - Generate portrait HTML using `generateCardPortrait`.
 *    - If generation fails, append a "No data available" container.
 *    - Add weight class information to the portrait section.
 *
 * 8. Append the stats section:
 *    - Build the stats panel using `createStatsPanel` and append it.
 *    - If generation fails, append an empty stats container.
 *
 * 9. Append the signature move section:
 *    - Generate signature move HTML using `generateCardSignatureMove` and append it.
 *    - If generation fails, append an empty signature move container.
 *
 * 10. Enable card interactivity:
 *    - Attach click and keyboard handlers to toggle `.show-card-back`.
 *
 * 11. Return the complete card container:
 *    - Append the `judoka-card` to the `card-container`.
 *
 * @param {Object} judoka - The judoka object containing data for the card.
 * @param {Object} gokyo - The Gokyo data (technique information).
 * @returns {HTMLElement} The DOM element for the complete judoka card.
 */
async function createTopBar(judoka, flagUrl) {
  return await safeGenerate(
    () => generateCardTopBar(judoka, flagUrl),
    "Failed to generate top bar:",
    createNoDataContainer()
  );
}

function createInspectorPanel(container, judoka) {
  let json;
  try {
    json = JSON.stringify(judoka, null, 2);
  } catch {
    const p = document.createElement("p");
    p.textContent = "Invalid card data";
    return p;
  }

  const panel = document.createElement("details");
  panel.className = "debug-panel";
  panel.setAttribute("aria-label", "Inspector panel");

  const summary = document.createElement("summary");
  summary.textContent = "Card Inspector";
  summary.tabIndex = 0;
  summary.style.minHeight = "44px";
  summary.style.minWidth = "44px";
  summary.style.display = "flex";
  summary.style.alignItems = "center";
  summary.style.outline = "2px solid transparent";
  summary.style.outlineOffset = "2px";
  summary.addEventListener("focus", () => {
    summary.style.outlineColor = "#000";
  });
  summary.addEventListener("blur", () => {
    summary.style.outlineColor = "transparent";
  });
  summary.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      panel.open = !panel.open;
      panel.dispatchEvent(new Event("toggle"));
    }
  });
  panel.appendChild(summary);

  const jsonPre = document.createElement("pre");
  jsonPre.textContent = json;
  panel.appendChild(jsonPre);

  // Only show the card's JSON data. The markup preview was removed to
  // keep the inspector output concise.

  function updateDataset() {
    summary.setAttribute("aria-expanded", panel.open ? "true" : "false");
    if (panel.open) {
      container.dataset.inspector = "true";
    } else {
      container.removeAttribute("data-inspector");
    }
  }

  panel.addEventListener("toggle", updateDataset);
  updateDataset();

  return panel;
}

export { createInspectorPanel };

/**
 * Build and return a DOM container for a judoka card.
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

  const topBarElement = await createTopBar(judoka, flagUrl);
  judokaCard.appendChild(topBarElement);

  const portraitElement = createPortraitSection(judoka);
  judokaCard.appendChild(portraitElement);

  const statsElement = await createStatsSection(judoka, cardType);
  judokaCard.appendChild(statsElement);

  const signatureMoveElement = createSignatureMoveSection(judoka, gokyoLookup, cardType);
  judokaCard.appendChild(signatureMoveElement);

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
