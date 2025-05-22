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
  const response = await fetch("../data/countryCodeMapping.json");
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

/**
 * Populates the country list in the specified container with country names and flags.
 *
 * Pseudocode:
 * 1. Fetch the country data:
 *    - Call `loadCountryCodeMapping` to retrieve the country data from the JSON file.
 *
 * 2. Filter active countries:
 *    - Use the `filter` method to include only countries where the `active` property is `true`.
 *
 * 3. Loop through the filtered country data:
 *    - For each country:
 *      a. Create a `div` element to serve as the slide container.
 *      b. Add a flag image:
 *         - Create an `img` element.
 *         - Use `getFlagUrl` to fetch the flag URL for the country.
 *         - Set the `src` attribute of the `img` element to the flag URL.
 *         - If the flag URL cannot be fetched, use a fallback flag URL.
 *      c. Add the country name:
 *         - Create a `p` element.
 *         - Set its text content to the country's name.
 *         - Append the `p` element to the slide container.
 *      d. Append the slide container to the specified container.
 *
 * 4. Handle errors:
 *    - If an error occurs while fetching the country data or generating the slides, log the error to the console.
 *
 * @param {HTMLElement} container - The DOM element where the country list will be appended.
 */
export async function populateCountryList(container) {
  try {
    const countryData = await loadCountryCodeMapping();

    for (const country of countryData.filter((country) => country.active)) {
      const slide = document.createElement("div");
      slide.className = "slide";

      const flagImg = document.createElement("img");
      flagImg.alt = `${country.country} Flag`;
      flagImg.className = "flag-image";

      try {
        const flagUrl = await getFlagUrl(country.code);
        flagImg.src = flagUrl;
      } catch (error) {
        console.warn(`Failed to load flag for ${country.country}:`, error);
        flagImg.src = "https://flagcdn.com/w320/vu.png"; // Fallback to Vanuatu flag
      }

      slide.appendChild(flagImg);

      const countryName = document.createElement("p");
      countryName.textContent = country.country;
      slide.appendChild(countryName);

      container.appendChild(slide);
    }
  } catch (error) {
    console.error("Error fetching country data:", error);
  }
}
