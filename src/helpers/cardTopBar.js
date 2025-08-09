import { getCountryByCode } from "../utils/countryCodes.js";
import { getValue } from "./utils.js";
import { debugLog } from "./debug.js";

const PLACEHOLDER_FLAG_URL = "../assets/countryFlags/placeholder-flag.png";

/**
 * Creates a DOM element to display a "No Data Available" message.
 *
 * @pseudocode
 * 1. Create a `<div>` element:
 *    - Set its `className` to `"card-top-bar"`.
 *    - Set its `textContent` to `"No data available"`.
 *
 * 2. Log the generated container for debugging.
 *
 * 3. Return the created `<div>` element.
 *
 * @returns {HTMLElement} Container element with the fallback message.
 */
export function createNoDataContainer() {
  const container = document.createElement("div");
  container.className = "card-top-bar";
  container.textContent = "No data available";
  debugLog("Generated container for missing judoka:", container);
  return container;
}

/**
 * Extracts judoka data (firstname, surname, and countryCode).
 *
 * @pseudocode
 * 1. Extract `firstname`:
 *    - Use `getValue` to default to `"Unknown"` if missing.
 *
 * 2. Extract `surname`:
 *    - Use `getValue` to default to an empty string (`""`) if missing.
 *
 * 3. Extract `countryCode`:
 *    - Use `getValue` to default to `"unknown"` if missing.
 *
 * 4. Return an object containing the extracted `firstname`, `surname`, and `countryCode`.
 */
function extractJudokaData(judoka) {
  const firstname = getValue(judoka.firstname, "Unknown");
  const surname = getValue(judoka.surname, "");
  const countryCode = getValue(judoka.countryCode, "unknown");
  return { firstname, surname, countryCode };
}

/**
 * Resolves the country name based on the provided country code.
 *
 * @pseudocode
 * 1. Check if `countryCode` is valid (not `"unknown"`):
 *    - If valid, call `getCountryByCode` and return the resolved name or `"Unknown"`.
 * 2. If `countryCode` is `"unknown"`, return `"Unknown"`.
 */
async function resolveCountryName(countryCode) {
  if (countryCode !== "unknown") {
    const countryName = await getCountryByCode(countryCode);
    return countryName || "Unknown";
  }
  debugLog("Country name is unknown.");
  return "Unknown";
}

/**
 * Creates a DOM element to display the judoka's name (firstname and surname).
 *
 * @pseudocode
 * 1. Create a `<div>` element:
 *    - Set its `className` to `"card-name"`.
 *
 * 2. Create and append a `<span>` for `firstname`:
 *    - Set its `className` to `"firstname"`.
 *    - Set its `textContent` to the provided `firstname`.
 *
 * 3. Create and append a `<span>` for `surname`:
 *    - Set its `className` to `"surname"`.
 *    - Set its `textContent` to the provided `surname`.
 *
 * 4. Return the `<div>` container.
 *
 * @param {string} firstname - Judoka first name.
 * @param {string} surname - Judoka surname.
 * @returns {HTMLElement} Container element with the formatted name.
 */
export function createNameContainer(firstname, surname) {
  const nameContainer = document.createElement("div");
  nameContainer.className = "card-name";

  const firstnameSpan = document.createElement("span");
  firstnameSpan.className = "firstname";
  // Use textContent to safely insert text without interpreting HTML
  firstnameSpan.textContent = firstname;

  const surnameSpan = document.createElement("span");
  surnameSpan.className = "surname";
  // Use textContent to safely insert text without interpreting HTML
  surnameSpan.textContent = surname;

  nameContainer.appendChild(firstnameSpan);
  nameContainer.appendChild(surnameSpan);

  return nameContainer;
}

/**
 * Creates a DOM element for the flag image.
 *
 * @pseudocode
 * 1. Create a `<div>` container:
 *    - Set its `className` to `"card-flag"`.
 *    - Add a `data-tooltip-id="card.flag"` attribute for tooltips.
 *
 * 2. Create an `<img>` element:
 *    - Set its `src` attribute to `finalFlagUrl` or fallback to `PLACEHOLDER_FLAG_URL`.
 *    - Set its `alt` attribute to the `countryName` followed by "flag".
 *
 * 3. Add an `onerror` handler to fallback to `PLACEHOLDER_FLAG_URL` if the image fails to load.
 *
 * 4. Append the `<img>` element to the container.
 *
 * 5. Return the container `<div>`.
 *
 * @param {string} finalFlagUrl - URL for the flag image.
 * @param {string} countryName - Country name used for alt text.
 * @returns {HTMLElement} Container element with the flag image.
 */
export function createFlagImage(finalFlagUrl, countryName) {
  debugLog(`Creating flag image with country name: ${countryName}`); // Debugging

  const flagContainer = document.createElement("div");
  flagContainer.className = "card-flag";
  flagContainer.dataset.tooltipId = "card.flag";

  const flagImg = document.createElement("img");

  flagImg.src = finalFlagUrl || PLACEHOLDER_FLAG_URL;

  const safeCountryName = countryName ? countryName : "Unknown";
  // Set alt attribute directly; the browser will handle any necessary escaping
  flagImg.setAttribute("alt", `${safeCountryName} flag`);

  flagImg.setAttribute("loading", "lazy");

  flagImg.setAttribute("onerror", `this.src='${PLACEHOLDER_FLAG_URL}'`);

  flagContainer.appendChild(flagImg);

  return flagContainer; // Return the container div
}

/**
 * Generates the top bar DOM element for a judoka card, including the name and flag.
 *
 * @pseudocode
 * 1. Validate the `judoka` object:
 *    - If missing, return a container with a "No data available" message.
 *
 * 2. Extract and sanitize judoka data:
 *    - Call `extractJudokaData` to retrieve `firstname`, `surname`, and `countryCode`.
 *
 * 3. Resolve the country name:
 *    - Call `resolveCountryName` asynchronously with `countryCode`.
 *
 * 4. Determine the flag URL:
 *    - Use `flagUrl` if provided, otherwise fallback to `PLACEHOLDER_FLAG_URL`.
 *
 * 5. Create the main container:
 *    - Create a `<div>` element with the class `card-top-bar`.
 *
 * 6. Append the name container:
 *    - Call `createNameContainer` and append the result.
 *
 * 7. Append the flag image:
 *    - Call `createFlagImage` and append the result.
 *
 * 8. Return the main container.
 *
 * @param {Object} judoka - Judoka data used to populate the top bar.
 * @param {string} judoka.firstname - The first name of the judoka.
 * @param {string} judoka.surname - The surname of the judoka.
 * @param {string} judoka.countryCode - The country code of the judoka.
 * @param {string} [flagUrl] - Optional URL for the flag image.
 * @returns {Promise<HTMLElement>} Promise resolving to the top bar element.
 */
export async function generateCardTopBar(judoka, flagUrl) {
  if (!judoka) {
    console.error("Judoka object is missing!");
    return createNoDataContainer();
  }
  const { firstname, surname, countryCode } = extractJudokaData(judoka);

  const countryName = await resolveCountryName(countryCode);
  debugLog(`Resolved country name: ${countryName}`); // Debugging

  const finalFlagUrl = flagUrl || PLACEHOLDER_FLAG_URL;
  debugLog(`Final flag URL: ${finalFlagUrl}`); // Debugging

  const container = document.createElement("div");
  container.className = "card-top-bar";

  const nameContainer = createNameContainer(firstname, surname);
  container.appendChild(nameContainer);

  const flagImg = createFlagImage(finalFlagUrl, countryName);
  container.appendChild(flagImg);

  return container; // Return the DOM element
}
