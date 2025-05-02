import { getCountryNameFromCode } from "./countryUtils.js";

const PLACEHOLDER_FLAG_URL = "./assets/countryFlags/placeholder-flag.png";

/**
 * Escapes special HTML characters in a string to prevent XSS (Cross-Site Scripting) attacks.
 *
 * Pseudocode:
 * 1. Check if the input `str` is a string:
 *    - If it is not a string, return the input as-is.
 *
 * 2. Replace special HTML characters in the string with their corresponding HTML entities:
 *    - Replace `&` with `&amp;`.
 *    - Replace `<` with `&lt;`.
 *    - Replace `>` with `&gt;`.
 *    - Replace `"` with `&quot;`.
 *    - Replace `'` with `&#039;`.
 *
 * 3. Return the escaped string.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Safely retrieves a value from an object, returning a default value if the property is missing or undefined.
 *
 * Pseudocode:
 * 1. Check if the `value` is not `undefined` or `null`:
 *    - If the `value` is valid, return it.
 *
 * 2. If the `value` is `undefined` or `null`:
 *    - Return the `defaultValue` provided as a fallback.
 *
 * @param {any} value - The value to check.
 * @param {any} defaultValue - The default value to return if the value is undefined or null.
 * @returns {any} The value if valid, otherwise the default value.
 */
function getValue(value, defaultValue) {
  return value !== undefined && value !== null ? value : defaultValue;
}

/**
 * Creates a DOM element to display a "No Data Available" message.
 *
 * Pseudocode:
 * 1. Create a `<div>` element:
 *    - Set its `className` to `"card-top-bar"`.
 *    - Set its `textContent` to `"No data available"`.
 *
 * 2. Log the generated container to the console for debugging.
 *
 * 3. Return the created `<div>` element.
 *
 * @returns {HTMLElement} The DOM element containing the "No data available" message.
 */
function createNoDataContainer() {
  const container = document.createElement("div");
  container.className = "card-top-bar";
  container.textContent = "No data available";
  console.log("Generated container for missing judoka:", container);
  return container;
}

/**
 * Extracts and sanitizes judoka data (firstname, surname, and countryCode).
 *
 * Pseudocode:
 * 1. Extract the `firstname` from the `judoka` object:
 *    - Use `getValue` to provide a default value of `"Unknown"` if `firstname` is missing or undefined.
 *    - Use `escapeHTML` to sanitize the `firstname` to prevent XSS attacks.
 *
 * 2. Extract the `surname` from the `judoka` object:
 *    - Use `getValue` to provide a default value of an empty string (`""`) if `surname` is missing or undefined.
 *    - Use `escapeHTML` to sanitize the `surname` to prevent XSS attacks.
 *
 * 3. Extract the `countryCode` from the `judoka` object:
 *    - Use `getValue` to provide a default value of `"unknown"` if `countryCode` is missing or undefined.
 *
 * 4. Log the extracted and sanitized values (`firstname`, `surname`, `countryCode`) for debugging.
 *
 * 5. Return an object containing the sanitized `firstname`, `surname`, and `countryCode`.
 *
 * @param {Object} judoka - The judoka object containing the data to extract.
 * @returns {Object} An object with the sanitized `firstname`, `surname`, and `countryCode`.
 */
function extractJudokaData(judoka) {
  const firstname = escapeHTML(getValue(judoka.firstname, "Unknown"));
  const surname = escapeHTML(getValue(judoka.surname, ""));
  const countryCode = getValue(judoka.countryCode, "unknown");
  return { firstname, surname, countryCode };
}

/**
 * Resolves the country name based on the provided country code.
 *
 * Pseudocode:
 * 1. Check if the `countryCode` is not `"unknown"`:
 *    - If true:
 *      a. Call the `getCountryNameFromCode` function (asynchronous) with the `countryCode`.
 *      b. Log the resolved country name to the console for debugging.
 *      c. Return the resolved country name.
 *
 * 2. If the `countryCode` is `"unknown"`:
 *    - Log a message indicating that the country name is unknown.
 *    - Return `"Unknown"` as the fallback country name.
 *
 * @param {string} countryCode - The country code to resolve.
 * @returns {Promise<string>} A promise that resolves to the country name or `"Unknown"`.
 */
async function resolveCountryName(countryCode) {
  if (countryCode !== "unknown") {
    const countryName = await getCountryNameFromCode(countryCode);
    console.log("Resolved country name:", countryName);
    return countryName;
  }
  console.log("Country name is unknown.");
  return "Unknown";
}

/**
 * Creates a DOM element to display the judoka's name (firstname and surname).
 *
 * Pseudocode:
 * 1. Create a `<div>` element:
 *    - Set its `className` to `"card-name"`.
 *
 * 2. Create a `<span>` element for the `firstname`:
 *    - Set its `className` to `"firstname"`.
 *    - Set its `textContent` to the provided `firstname`.
 *    - Append this `<span>` to the `<div>` container.
 *
 * 3. Create a `<span>` element for the `surname`:
 *    - Set its `className` to `"surname"`.
 *    - Set its `textContent` to the provided `surname`.
 *    - Append this `<span>` to the `<div>` container.
 *
 * 4. Log the generated name container to the console for debugging.
 *
 * 5. Return the `<div>` container containing the `firstname` and `surname`.
 *
 * @param {string} firstname - The judoka's first name.
 * @param {string} surname - The judoka's surname.
 * @returns {HTMLElement} The DOM element containing the judoka's name.
 */
function createNameContainer(firstname, surname) {
  const nameContainer = document.createElement("div");
  nameContainer.className = "card-name";

  const firstnameSpan = document.createElement("span");
  firstnameSpan.className = "firstname";
  firstnameSpan.textContent = firstname;

  const surnameSpan = document.createElement("span");
  surnameSpan.className = "surname";
  surnameSpan.textContent = surname;

  nameContainer.appendChild(firstnameSpan);
  nameContainer.appendChild(surnameSpan);

  console.log("Name container generated:", nameContainer);
  return nameContainer;
}

/**
 * Creates a DOM element for the flag image.
 *
 * Pseudocode:
 * 1. Create an `<img>` element:
 *    - Set its `className` to `"card-flag"`.
 *    - Set its `src` attribute to the provided `finalFlagUrl`.
 *    - Set its `alt` attribute to the `countryName` followed by "flag".
 *
 * 2. Add an `onerror` event handler to the `<img>` element:
 *    - If the image fails to load, set the `src` to the `PLACEHOLDER_FLAG_URL`.
 *    - Log a warning to the console indicating that the placeholder flag is being used.
 *
 * 3. Log the generated flag image element to the console for debugging.
 *
 * 4. Return the created `<img>` element.
 *
 * @param {string} finalFlagUrl - The URL of the flag image.
 * @param {string} countryName - The name of the country for the flag.
 * @returns {HTMLElement} The DOM element for the flag image.
 */
function createFlagImage(finalFlagUrl, countryName) {
  // Create the container div
  const flagContainer = document.createElement("div");
  flagContainer.className = "card-flag";

  // Create the flag image
  const flagImg = document.createElement("img");
  flagImg.src = finalFlagUrl;
  flagImg.alt = `${countryName} flag`;
  flagImg.onerror = () => {
    flagImg.src = PLACEHOLDER_FLAG_URL;
    console.warn("Flag image failed to load, using placeholder:", PLACEHOLDER_FLAG_URL);
  };

  // Append the image to the container
  flagContainer.appendChild(flagImg);

  return flagContainer; // Return the container div
}

/**
 * Generates the top bar DOM element for a judoka card, including the name and flag.
 *
 * Pseudocode:
 * 1. Check if the `judoka` object is provided:
 *    - If not, log an error and return a container with a "No data available" message.
 *
 * 2. Log the received `judoka` object for debugging.
 *
 * 3. Extract and sanitize the judoka's data:
 *    - Call `extractJudokaData` to retrieve the `firstname`, `surname`, and `countryCode`.
 *
 * 4. Resolve the country name:
 *    - Call `resolveCountryName` asynchronously with the `countryCode`.
 *
 * 5. Determine the flag URL:
 *    - Use the provided `flagUrl` if available.
 *    - Otherwise, use the `PLACEHOLDER_FLAG_URL`.
 *    - Log the final flag URL for debugging.
 *
 * 6. Create the main container:
 *    - Create a `<div>` element with the class `card-top-bar`.
 *
 * 7. Create and append the name container:
 *    - Call `createNameContainer` with the `firstname` and `surname`.
 *    - Append the returned DOM element to the main container.
 *
 * 8. Create and append the flag image:
 *    - Call `createFlagImage` with the `finalFlagUrl` and `countryName`.
 *    - Append the returned DOM element to the main container.
 *
 * 9. Log the final generated container for debugging.
 *
 * 10. Return the main container DOM element.
 *
 * @param {Object} judoka - The judoka object containing data for the card.
 * @param {string} [flagUrl] - The URL of the flag image.
 * @returns {HTMLElement} The DOM element for the top bar.
 */
export async function generateCardTopBar(judoka, flagUrl) {
  if (!judoka) {
    console.error("Judoka object is missing!");
    return createNoDataContainer();
  }

  // Extract and sanitize judoka data
  const { firstname, surname, countryCode } = extractJudokaData(judoka);

  // Resolve the country name
  const countryName = await resolveCountryName(countryCode);

  // Determine the final flag URL
  const finalFlagUrl = flagUrl || PLACEHOLDER_FLAG_URL;

  // Create the main container
  const container = document.createElement("div");
  container.className = "card-top-bar";

  // Create and append the name container
  const nameContainer = createNameContainer(firstname, surname);
  container.appendChild(nameContainer);

  // Create and append the flag image
  const flagImg = createFlagImage(finalFlagUrl, countryName);
  container.appendChild(flagImg);

  return container; // Return the DOM element
}
