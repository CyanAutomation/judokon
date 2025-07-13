import { getFlagUrl } from "./countryUtils.js";
import { generateCardTopBar, createNoDataContainer } from "./cardTopBar.js";
import { generateCardPortrait, generateCardSignatureMove } from "./cardRender.js";
import { createStatsPanel } from "../components/StatsPanel.js";
import { safeGenerate } from "./errorUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";

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
 * Determine if a value should be treated as missing.
 *
 * @pseudocode
 * 1. Return `true` when the value is `undefined` or `null`.
 * 2. If the value is a string, trim whitespace and check if it is empty.
 * 3. Otherwise, return `false`.
 *
 * @param {*} value - The value to examine.
 * @returns {boolean} `true` when the value is missing.
 */
function isValueMissing(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/**
 * Validates the required fields of a Judoka object.
 *
 * @pseudocode
 * 1. Skip validation if `judoka.id` equals `0`.
 *
 * 2. Define required fields for the judoka object:
 *    - Include fields like "firstname", "surname", "country", etc.
 *
 * 3. Check for missing fields:
 *    - Use `isValueMissing` to test each required field.
 *    - Throw an error if any required fields are missing.
 *
 * 4. Validate stats fields:
 *    - Define required stats fields like "power", "speed", etc.
 *    - Check for missing stats fields in `judoka.stats` with `isValueMissing`.
 *    - Throw an error if any required stats fields are missing.
 *
 * @param {Object} judoka - The judoka object to validate.
 * @throws {Error} If required fields are missing.
 */
function validateJudoka(judoka) {
  if (judoka.id === 0) return;

  const requiredFields = [
    "firstname",
    "surname",
    "country",
    "countryCode",
    "stats",
    "weightClass",
    "signatureMoveId",
    "rarity"
  ];
  const missingFields = requiredFields.filter((field) => isValueMissing(judoka[field]));

  if (missingFields.length > 0) {
    throw new Error(`Invalid Judoka object: Missing required fields: ${missingFields.join(", ")}`);
  }

  const requiredStatsFields = ["power", "speed", "technique", "kumikata", "newaza"];
  const missingStatsFields = requiredStatsFields.filter((field) =>
    isValueMissing(judoka.stats?.[field])
  );

  if (missingStatsFields.length > 0) {
    throw new Error(
      `Invalid Judoka stats: Missing required fields: ${missingStatsFields.join(", ")}`
    );
  }
}

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
 * 10. Return the complete card container:
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

function createPortraitSection(judoka) {
  try {
    // generateCardPortrait returns a complete `.card-portrait` wrapper
    const fragment = document.createRange().createContextualFragment(generateCardPortrait(judoka));
    const portraitElement = fragment.firstElementChild;

    const weightClassElement = document.createElement("div");
    weightClassElement.className = "card-weight-class";
    weightClassElement.textContent = judoka.weightClass;
    portraitElement.appendChild(weightClassElement);

    return portraitElement;
  } catch (error) {
    console.error("Failed to generate portrait:", error);
    return createNoDataContainer();
  }
}

function createStatsSection(judoka, cardType) {
  try {
    return createStatsPanel(judoka.stats, { type: cardType });
  } catch (error) {
    console.error("Failed to generate stats:", error);
    return createNoDataContainer();
  }
}

function createSignatureMoveSection(judoka, gokyoLookup, cardType) {
  try {
    const signatureMoveHTML = generateCardSignatureMove(judoka, gokyoLookup, cardType);
    const fragment = document.createRange().createContextualFragment(signatureMoveHTML);
    return fragment.firstElementChild;
  } catch (error) {
    console.error("Failed to generate signature move:", error);
    return createNoDataContainer();
  }
}

/**
 * Build and return a DOM container for a judoka card.
 *
 * Validates the judoka data and gokyo lookup, generates DOM sections for the card, and assembles them into a single container. When either argument is missing, a fallback element labeled "No data available" is returned.
 *
 * @param {import("./types.js").Judoka} judoka - Judoka data with required fields such as names, country codes, stats and signatureMoveId.
 * @param {Record<number, import("./types.js").GokyoEntry>} gokyoLookup - Map of technique ids to technique details. Missing lookups result in fallback content.
 * @returns {HTMLElement} Container element containing the completed card.
 */
export async function generateJudokaCardHTML(judoka, gokyoLookup) {
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

  const statsElement = createStatsSection(judoka, cardType);
  judokaCard.appendChild(statsElement);

  const signatureMoveElement = createSignatureMoveSection(judoka, gokyoLookup, cardType);
  judokaCard.appendChild(signatureMoveElement);

  cardContainer.appendChild(judokaCard);

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
export async function generateJudokaCard(judoka, gokyoLookup, container) {
  const card = await safeGenerate(
    () => generateJudokaCardHTML(judoka, gokyoLookup),
    `Error generating card for judoka: ${judoka.firstname} ${judoka.surname}`,
    null
  );
  if (card) {
    container.appendChild(card);
  }
  return card;
}
