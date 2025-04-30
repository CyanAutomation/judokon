// const PLACEHOLDER_FLAG_URL = "./assets/countryFlags/placeholder-flag.png";

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

  const data = await response.json();

  // Validate that all entries have a 2-letter code
  data.forEach((entry) => {
    if (!/^[A-Za-z]{2}$/.test(entry.code)) {
      console.warn(`Invalid country code found: ${entry.code}`);
    }
  });

  return data;
}

/**
 * Returns the country name for a given code, or 'Unknown' if not found/active.
 *
 * Pseudocode:
 * 1. Validate the input code:
 *    - Check if code is a string and is not empty (after trimming whitespace).
 *    - If code is invalid, return VU.
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
 *    - If no match is found, return VANUATU.
 *
 * @param {string} countryCode - The 2-letter country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the flag URL or the placeholder flag URL.
 */
export async function getCountryNameFromCode(code) {
  if (typeof code !== "string" || !/^[A-Za-z]{2}$/.test(code.trim())) {
    console.warn("Invalid country code format. Expected a 2-letter code.");
    return "Vanuatu"; // Fallback to Vanuatu
  }

  const countryCodeMapping = await loadCountryCodeMapping();

  const match = countryCodeMapping.find(
    (entry) => entry.code.toLowerCase() === code.toLowerCase() && entry.active
  );

  // Fallback to Vanuatu if no match is found
  return match ? match.country : "Vanuatu";
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
 * @param {string} countryCode - The 2-letter country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the flag URL or the placeholder flag URL.
 */
export async function getFlagUrl(countryCode) {
  console.log(`Country code received: "${countryCode}"`); // Debugging log

  if (typeof countryCode !== "string" || !/^[A-Za-z]{2}$/.test(countryCode.trim())) {
    console.warn("Invalid or missing country code. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png"; // Fallback to Vanuatu flag
  }

  const countryCodeMapping = await loadCountryCodeMapping();

  const isValid = countryCodeMapping.some(
    (entry) => entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active
  );

  if (!isValid) {
    console.warn("Invalid country code. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png"; // Fallback to Vanuatu flag
  }

  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}
