const PLACEHOLDER_FLAG_URL = "./assets/countryFlags/placeholder-flag.png";

/**
 * Loads the country code mapping JSON from the server.
 * 
 * Pseudocode:
 * 1. Use the `fetch` API to send a GET request to the `countryCodeMapping.json` file.
 * 
 * 2. Check the response status:
 *    - If the response is not OK (`response.ok` is false), throw an error with the message "Failed to load country code mapping".
 * 
 * 3. Parse the response body as JSON:
 *    - Use `response.json()` to convert the response body into a JavaScript object.
 * 
 * 4. Return the parsed JSON data.
 * 
 * @returns {Promise<Array>} Resolves to an array of country code mappings.
 */
async function loadCountryCodeMapping() {
  const response = await fetch("./data/countryCodeMapping.json");
  if (!response.ok) {
    throw new Error("Error - Failed to load the country code mapping");
  }
  return response.json();
}

/**
 * Returns the country name for a given code, or 'Unknown' if not found/active.
 * 
 * Pseudocode:
 * 1. Validate the input code:
 *    - Check if code is a string and is not empty (after trimming whitespace).
 *    - If code is invalid, return "Unknown".
 * 
 * 2. Load the country code mapping:
 *    - Call loadCountryCodeMapping to fetch the mapping data.
 * 
 * 3. Search for a matching entry in the mapping:
 *    - Use the find method to locate an entry where:
 *      a. The code matches the input `code` (case-insensitive).
 *      b. The active property of the entry is true.
 * 
 * 4. Return the country name:
 *    - If a matching entry is found, return the country property of the entry.
 *    - If no match is found, return "Unknown".
 * 
 * @param {string} code - The country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the country name or "Unknown".
 */
export async function getCountryNameFromCode(code) {
  if (typeof code !== "string" || !code.trim()) return "Unknown";

  const countryCodeMapping = await loadCountryCodeMapping();

  const match = countryCodeMapping.find(
    (entry) => entry.code.toLowerCase() === code.toLowerCase() && entry.active
  );

  return match ? match.country : "Unknown";
}

/**
 * Returns the flag URL for a given country code, or a placeholder if missing/invalid.
 * 
 * Pseudocode:
 * 1. Check if the countryCode is provided:
 *    - If countryCode is missing or false, log a warning and return the placeholder flag URL.
 * 
 * 2. Load the country code mapping:
 *    - Call loadCountryCodeMapping to fetch the mapping data.
 * 
 * 3. Validate the countryCode
 *    - Use the SOME method to check if there is an entry in the mapping where:
 *      a. The code matches the input countryCode (case-insensitive).
 *      b. The active property of the entry is true.
 *    - If no valid entry is found, log a warning and return the placeholder flag URL.
 * 
 * 4. Construct the flag URL:
 *    - Convert the countryCode to lowercase.
 *    - Return the URL in the format https://flagcdn.com/w320/{countryCode}.png.
 * 
 * @param {string} countryCode - The country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the flag URL or the placeholder flag URL.
 */
export async function getFlagUrl(countryCode) {
  if (!countryCode) {
    console.warn("Missing country code. Using placeholder flag instead.");
    return PLACEHOLDER_FLAG_URL;
  }

  const countryCodeMapping = await loadCountryCodeMapping();

  const isValid = countryCodeMapping.some(
    (entry) => entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active
  );

  if (!isValid) {
    console.warn("Invalid country code. Using placeholder flag.");
    return PLACEHOLDER_FLAG_URL;
  }

  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}