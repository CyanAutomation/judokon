import { getFlagUrl } from "./countryUtils.js";
import { generateCardTopBar, createNoDataContainer } from "./cardTopBar.js";
import {
  generateCardPortrait,
  generateCardStats,
  generateCardSignatureMove
} from "./cardRender.js";

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
 * Validates the required fields of a Judoka object.
 *
 * @pseudocode
 * 1. Define required fields for the judoka object:
 *    - Include fields like "firstname", "surname", "country", etc.
 *
 * 2. Check for missing fields:
 *    - Use `filter` to find fields not present in the `judoka` object.
 *    - Throw an error if any required fields are missing.
 *
 * 3. Validate stats fields:
 *    - Define required stats fields like "power", "speed", etc.
 *    - Check for missing stats fields in the `judoka.stats` object.
 *    - Throw an error if any required stats fields are missing.
 *
 * @param {Object} judoka - The judoka object to validate.
 * @throws {Error} If required fields are missing.
 */
function validateJudoka(judoka) {
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
  const missingFields = requiredFields.filter((field) => !judoka[field]);

  if (missingFields.length > 0) {
    throw new Error(`Invalid Judoka object: Missing required fields: ${missingFields.join(", ")}`);
  }

  const requiredStatsFields = ["power", "speed", "technique", "kumikata", "newaza"];
  const missingStatsFields = requiredStatsFields.filter((field) => !judoka.stats?.[field]);

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
 *    - Ensure all required fields are present using `validateJudoka`.
 *
 * 2. Generate the flag URL:
 *    - Use `getFlagUrl` with the `countryCode` from the `judoka` object.
 *    - Default to "vu" if `countryCode` is missing.
 *    - If fetching the flag fails, fallback to the Vanuatu flag.
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
 *    - Generate the top bar using `generateCardTopBar` inside a `try...catch`.
 *    - If generation fails, append a "No data available" container instead.
 *
 * 7. Append the portrait section:
 *    - Generate portrait HTML using `generateCardPortrait` inside a `try...catch`.
 *    - If generation fails, append a fallback container from `createNoDataContainer`.
 *    - When successful, add weight class information to the portrait section.
 *
 * 8. Append the stats section:
 *    - Generate stats HTML using `generateCardStats` inside a `try...catch`.
 *    - If generation fails, append a fallback container from `createNoDataContainer`.
 *
 * 9. Append the signature move section:
 *    - Generate signature move HTML using `generateCardSignatureMove` inside a `try...catch`.
 *    - If generation fails, append a fallback container from `createNoDataContainer`.
 *
 * 10. Return the complete card container:
 *    - Append the `judoka-card` to the `card-container`.
 *
 * @param {Object} judoka - The judoka object containing data for the card.
 * @param {Object} gokyo - The Gokyo data (technique information).
 * @returns {HTMLElement} The DOM element for the complete judoka card.
 */
export async function generateJudokaCardHTML(judoka, gokyoLookup) {
  validateJudoka(judoka);

  const countryCode = judoka.countryCode;
  let flagUrl;
  try {
    flagUrl = await getFlagUrl(countryCode || "vu"); // Default to "vu" (Vanuatu)
  } catch (error) {
    console.error("Failed to resolve flag URL:", error);
    flagUrl = "https://flagcdn.com/w320/vu.png";
  }

  const cardType = judoka.rarity?.toLowerCase() || "common";

  // Create the main card container
  const cardContainer = document.createElement("div");
  cardContainer.className = "card-container";

  const judokaCard = document.createElement("div");
  judokaCard.className = `judoka-card ${cardType}`;

  // Add gender-specific class after initializing judokaCard
  const genderClass = judoka.gender === "female" ? "female-card" : "male-card";
  judokaCard.classList.add(genderClass);

  let topBarElement;
  try {
    topBarElement = await generateCardTopBar(judoka, flagUrl);
  } catch (error) {
    console.error("Failed to generate top bar:", error);
    topBarElement = createNoDataContainer();
  }
  judokaCard.appendChild(topBarElement);

  let portraitElement;
  try {
    const portraitHTML = generateCardPortrait(judoka);
    portraitElement = document.createElement("div");
    portraitElement.className = "card-portrait";
    portraitElement.innerHTML = portraitHTML;

    const weightClassElement = document.createElement("div");
    weightClassElement.className = "card-weight-class";
    weightClassElement.textContent = judoka.weightClass;
    portraitElement.appendChild(weightClassElement);
  } catch (error) {
    console.error("Failed to generate portrait:", error);
    portraitElement = createNoDataContainer();
  }

  judokaCard.appendChild(portraitElement);

  let statsElement;
  try {
    const statsHTML = generateCardStats(judoka, cardType);
    statsElement = document.createElement("div");
    statsElement.className = "card-stats";
    statsElement.innerHTML = statsHTML;
  } catch (error) {
    console.error("Failed to generate stats:", error);
    statsElement = createNoDataContainer();
  }
  judokaCard.appendChild(statsElement);

  let signatureMoveElement;
  try {
    const signatureMoveHTML = generateCardSignatureMove(judoka, gokyoLookup, cardType);
    signatureMoveElement = document.createElement("div");
    signatureMoveElement.innerHTML = signatureMoveHTML;
  } catch (error) {
    console.error("Failed to generate signature move:", error);
    signatureMoveElement = createNoDataContainer();
  }
  judokaCard.appendChild(signatureMoveElement);

  cardContainer.appendChild(judokaCard);

  return cardContainer;
}

/**
 * Generates a single judoka card and appends it to the container.
 *
 * @pseudocode
 * 1. Generate the card HTML:
 *    - Use `generateJudokaCardHTML` with the `judoka` and `gokyoLookup`.
 *
 * 2. Append the card to the container:
 *    - Use `appendChild` to add the card to the DOM.
 *
 * 3. Handle errors:
 *    - Log an error message if card generation fails.
 *    - Include the judoka's name in the error message for debugging.
 *
 * @param {Object} judoka - A judoka object containing data for the card.
 * @param {Object} gokyoLookup - A lookup object for gokyo data.
 * @param {HTMLElement} container - The container to append the card to.
 */
export async function generateJudokaCard(judoka, gokyoLookup, container) {
  try {
    const card = await generateJudokaCardHTML(judoka, gokyoLookup);
    container.appendChild(card);
    return card;
  } catch (error) {
    console.error(`Error generating card for judoka: ${judoka.firstname} ${judoka.surname}`, error);
    return null;
  }
}
