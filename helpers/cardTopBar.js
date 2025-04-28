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
 * Generates the top bar HTML for a judoka card, including name and flag.
 *
 * Pseudocode:
 * 1. Check if the `judoka` object is provided:
 *    - If not, log an error and return a default object with placeholder data.
 *
 * 2. Extract and sanitize the judoka's `firstname` and `surname`:
 *    - Use `escapeHTML` to prevent XSS attacks.
 *    - Use `getValue` to provide default values if the properties are missing.
 *
 * 3. Extract the `countryCode` from the judoka object:
 *    - Use `getValue` to provide a default value of "unknown" if missing.
 *
 * 4. Resolve the country name:
 *    - If the `countryCode` is not "unknown", call `getCountryNameFromCode` (asynchronous) to get the country name.
 *    - Otherwise, use "Unknown" as the country name.
 *
 * 5. Construct the full title for the judoka:
 *    - Combine the sanitized `firstname` and `surname`.
 *
 * 6. Determine the flag URL:
 *    - Use the provided `flagUrl` if available.
 *    - Otherwise, use the `PLACEHOLDER_FLAG_URL`.
 *
 * 7. Construct the result object:
 *    - Include the `title` (full name), `flagUrl`, and `html` (the generated HTML string for the top bar).
 *
 * 8. Log the generated result for debugging.
 *
 * 9. Return the result object.
 *
 * @param {Judoka} judoka - The judoka object containing data for the card.
 * @param {string} [flagUrl] - The URL of the flag image.
 * @returns {Object} An object with `title`, `flagUrl`, and `html` properties.
 */
export async function generateCardTopBar(judoka, flagUrl) {
  if (!judoka) {
    console.error("Judoka object is missing!");

    // Create a container div with a "No data available" message
    const container = document.createElement("div");
    container.className = "card-top-bar";
    container.textContent = "No data available";

    console.log("Generated container for missing judoka:", container);
    return container;
  }

  console.log("Judoka object received:", judoka);

  const firstname = escapeHTML(getValue(judoka.firstname, "Unknown"));
  const surname = escapeHTML(getValue(judoka.surname, ""));
  const countryCode = getValue(judoka.countryCode, "unknown");

  console.log("Extracted values:", { firstname, surname, countryCode });

  // Await the resolved country name
  const countryName =
    countryCode !== "unknown" ? await getCountryNameFromCode(countryCode) : "Unknown";

  console.log("Resolved country name:", countryName);

  const finalFlagUrl = flagUrl || PLACEHOLDER_FLAG_URL;

  console.log("Final flag URL:", finalFlagUrl);

  // Create the container div
  const container = document.createElement("div");
  container.className = "card-top-bar";

  // Create the name container
  const nameContainer = document.createElement("div");
  nameContainer.className = "card-name";

  // Create and append the firstname span
  const firstnameSpan = document.createElement("span");
  firstnameSpan.className = "firstname";
  firstnameSpan.textContent = firstname;
  nameContainer.appendChild(firstnameSpan);

  // Create and append the surname span
  const surnameSpan = document.createElement("span");
  surnameSpan.className = "surname";
  surnameSpan.textContent = surname;
  nameContainer.appendChild(surnameSpan);

  // Append the name container to the main container
  container.appendChild(nameContainer);

  console.log("Name container generated:", nameContainer);

  // Create the flag image
  const flagImg = document.createElement("img");
  flagImg.className = "card-flag";
  flagImg.src = finalFlagUrl;
  flagImg.alt = `${countryName} flag`;
  flagImg.onerror = () => {
    flagImg.src = PLACEHOLDER_FLAG_URL;
    console.warn("Flag image failed to load, using placeholder:", PLACEHOLDER_FLAG_URL);
  };

  // Append the flag image to the main container
  container.appendChild(flagImg);

  console.log("Flag image generated:", flagImg);

  console.log("Final generated container:", container);

  return container; // Return the DOM element
}
