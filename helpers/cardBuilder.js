import { getFlagUrl } from "./countryUtils.js";
import { generateCardTopBar } from "./cardTopBar.js";
import {
  generateCardPortrait,
  generateCardStats,
  generateCardSignatureMove
} from "./cardRender.js";

/**
 * Generates the "last updated" HTML for a judoka card.
 *
 * Pseudocode:
 * 1. Check if the `date` parameter is provided:
 *    - If `date` is undefined or falsy, return an empty string (do not render anything).
 *
 * 2. Determine the safe date format:
 *    - If `date` is a `Date` object, convert it to a string in "YYYY-MM-DD" format using `toISOString` and split it.
 *    - If `date` is already a string, use it as-is.
 *
 * 3. Escape the safe date string to prevent XSS attacks:
 *    - Use the `escapeHTML` function to sanitize the date string.
 *
 * 4. Return the HTML string for the "last updated" section:
 *    - Wrap the escaped date in a `<div>` with the class `card-updated`.
 *
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
 *
 * Pseudocode:
 * 1. Define an array of required fields: ["firstname", "surname", "country", "stats", "weightClass"].
 *
 * 2. Check if any of the required fields are missing:
 *    - Use the `filter` method to create an array of fields that are not present in the `judoka` object.
 *
 * 3. If there are missing fields:
 *    - Throw an error with a message listing the missing fields.
 *
 * 4. If all required fields are present:
 *    - Do nothing and allow the function to complete successfully.
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
 * Pseudocode:
 * 1. Validate the `judoka` object:
 *    - Call `validateJudoka` to ensure all required fields are present.
 *    - If validation fails, throw an error.
 *
 * 2. Generate the flag URL:
 *    - Extract the `countryCode` from the `judoka` object.
 *    - If `countryCode` is missing, log a warning and use a default value ("vu").
 *    - Call `getFlagUrl` asynchronously to get the flag URL.
 *
 * 3. Format the `lastUpdated` date:
 *    - If `lastUpdated` is a string, use it as-is.
 *    - If `lastUpdated` is a `Date` object, convert it to a string in "YYYY-MM-DD" format.
 *    - If `lastUpdated` is undefined, use an empty string.
 *
 * 4. Create the main card container:
 *    - Create a `<div>` element with the class `card-container`.
 *    - Create a child `<div>` element with the class `judoka-card`.
 *
 * 5. Append the top bar:
 *    - Call `generateCardTopBar` asynchronously with the `judoka` object and `flagUrl`.
 *    - Append the returned DOM element to the `judoka-card` container.
 *
 * 6. Append the portrait section:
 *    - Call `generateCardPortrait` to get the portrait HTML string.
 *    - Create a `<div>` element, set its `innerHTML` to the portrait HTML, and append it to the `judoka-card`.
 *
 * 7. Append the stats section:
 *    - Call `generateCardStats` to get the stats HTML string.
 *    - Create a `<div>` element, set its `innerHTML` to the stats HTML, and append it to the `judoka-card`.
 *
 * 8. Append the signature move section:
 *    - Call `generateCardSignatureMove` with the `judoka` and `gokyo` objects to get the signature move HTML string.
 *    - Create a `<div>` element, set its `innerHTML` to the signature move HTML, and append it to the `judoka-card`.
 *
 * 9. Append the last updated section:
 *    - Call `generateCardLastUpdated` with the formatted `lastUpdated` date to get the last updated HTML string.
 *    - Create a `<div>` element, set its `innerHTML` to the last updated HTML, and append it to the `judoka-card`.
 *
 * 10. Append the `judoka-card` to the `card-container`.
 *
 * 11. Return the `card-container` DOM element.
 *
 * @param {Object} judoka - The judoka object containing data for the card.
 * @param {Object} gokyo - The Gokyo data (technique information).
 * @returns {HTMLElement} The DOM element for the complete judoka card.
 */
export async function generateJudokaCardHTML(judoka, gokyoLookup) {
  validateJudoka(judoka);

  const countryCode = judoka.countryCode;
  const flagUrl = await getFlagUrl(countryCode || "vu"); // Default to "vu" (Vanuatu)

  const cardType = judoka.rarity?.toLowerCase() || "common";

  // Create the main card container
  const cardContainer = document.createElement("div");
  cardContainer.className = "card-container";

  const judokaCard = document.createElement("div");
  judokaCard.className = `judoka-card ${cardType}`;

  // Add gender-specific class after initializing judokaCard
  const genderClass = judoka.gender === "female" ? "female-card" : "male-card";
  judokaCard.classList.add(genderClass);

  const topBarElement = await generateCardTopBar(judoka, flagUrl);
  judokaCard.appendChild(topBarElement);

  const portraitHTML = generateCardPortrait(judoka);
  const portraitElement = document.createElement("div");
  portraitElement.className = "card-portrait";
  portraitElement.innerHTML = portraitHTML;

  const weightClassElement = document.createElement("div");
  weightClassElement.className = "card-weight-class";
  weightClassElement.textContent = judoka.weightClass;
  portraitElement.appendChild(weightClassElement);

  judokaCard.appendChild(portraitElement);

  const statsHTML = generateCardStats(judoka, cardType);
  const statsElement = document.createElement("div");
  statsElement.innerHTML = statsHTML;
  judokaCard.appendChild(statsElement);

  const signatureMoveHTML = generateCardSignatureMove(judoka, gokyoLookup, cardType);
  const signatureMoveElement = document.createElement("div");
  signatureMoveElement.innerHTML = signatureMoveHTML;
  judokaCard.appendChild(signatureMoveElement);

  cardContainer.appendChild(judokaCard);

  return cardContainer;
}

/**
 * Generates a single judoka card and appends it to the container.
 *
 * Pseudocode:
 * 1. Call the `generateJudokaCardHTML` function:
 *    - Pass the `judoka` object and `gokyoLookup` to generate the card's HTML structure.
 * 2. Append the generated card to the specified container:
 *    - Use the `appendChild` method to add the card to the DOM.
 * 3. Handle errors:
 *    - If an error occurs during card generation, log an error message to the console.
 *    - Include the judoka's name in the error message for easier debugging.
 *
 * @param {Object} judoka - A judoka object containing data for the card.
 * @param {Object} gokyoLookup - A lookup object for gokyo data.
 * @param {HTMLElement} container - The container to append the card to.
 */
async function generateJudokaCard(judoka, gokyoLookup, container) {
  try {
    const card = await generateJudokaCardHTML(judoka, gokyoLookup);
    container.appendChild(card);
  } catch (error) {
    console.error(`Error generating card for judoka: ${judoka.firstname} ${judoka.surname}`, error);
  }
}
