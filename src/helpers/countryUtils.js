// const PLACEHOLDER_FLAG_URL = "./assets/countryFlags/placeholder-flag.png";

/**
 * Loads the country code mapping JSON from the server.
 *
 * @pseudocode
 * 1. Send a GET request to fetch the `countryCodeMapping.json` file using the `fetch` API.
 *    - If the response status is not OK (`response.ok` is false), throw an error with a descriptive message.
 *
 * 2. Parse the response body as JSON:
 *    - Convert the response body into a JavaScript object using `response.json()`.
 *
 * 3. Validate the parsed JSON data:
 *    - For each entry, check that:
 *      a. `country` is a string.
 *      b. `code` matches the 2-letter country code format (`^[A-Za-z]{2}$`).
 *      c. `active` is a boolean.
 *    - Log a warning for any invalid entries.
 *
 * 4. Return the validated JSON data.
 *
 * @returns {Promise<CountryCodeEntry[]>} Resolves to an array of country code mappings.
 */
import { debugLog } from "./debug.js";
import { DATA_DIR } from "./constants.js";

const SCROLL_THRESHOLD_PX = 50;

let countryCodeMappingCache = null;
const COUNTRY_CACHE_KEY = "countryCodeMappingCache";

async function loadCountryCodeMapping() {
  if (countryCodeMappingCache) {
    return countryCodeMappingCache;
  }

  if (typeof localStorage !== "undefined") {
    const cached = localStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) {
      try {
        countryCodeMappingCache = JSON.parse(cached);
        return countryCodeMappingCache;
      } catch (e) {
        console.warn("Failed to parse cached country code mapping", e);
      }
    }
  }

  const response = await fetch(`${DATA_DIR}countryCodeMapping.json`);
  if (!response.ok) {
    throw new Error("Error - Failed to load the country code mapping");
  }

  const data = await response.json();

  data.forEach((entry) => {
    if (
      typeof entry.country !== "string" ||
      !/^[A-Za-z]{2}$/.test(entry.code) ||
      typeof entry.active !== "boolean"
    ) {
      console.warn(`Invalid country code entry found:`, entry);
    }
  });
  debugLog("Loaded country code mapping:", data);

  countryCodeMappingCache = data;

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(COUNTRY_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to cache country code mapping", e);
    }
  }

  return data;
}

/**
 * Returns the country name for a given code, or 'Vanuatu' if not found/active.
 *
 * @pseudocode
 * 1. Validate the input `code`:
 *    - Ensure `code` is a non-empty string matching the 2-letter format (`^[A-Za-z]{2}$`).
 *    - If invalid, log a warning and return "Vanuatu".
 *
 * 2. Fetch the country code mapping:
 *    - Call `loadCountryCodeMapping` to retrieve the mapping data.
 *
 * 3. Search for a matching entry:
 *    - Use `find` to locate an entry where:
 *      a. `code` matches the input `code` (case-insensitive).
 *      b. `active` is `true`.
 *
 * 4. Return the country name:
 *    - If a match is found, return the `country` property.
 *    - Otherwise, return "Vanuatu".
 *
 * @param {string} code - The 2-letter country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the country name or "Vanuatu".
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

  debugLog(`Resolved country name for code "${code}":`, match ? match.country : "Vanuatu");

  return match ? match.country : "Vanuatu";
}

/**
 * Returns the flag URL for a given country code, or a fallback URL if missing/invalid.
 *
 * @pseudocode
 * 1. Validate the input `countryCode`:
 *    - Ensure `countryCode` is a non-empty string matching the 2-letter format (`^[A-Za-z]{2}$`).
 *    - If invalid, log a warning and return the fallback flag URL for Vanuatu.
 *
 * 2. Fetch the country code mapping:
 *    - Call `loadCountryCodeMapping` to retrieve the mapping data.
 *
 * 3. Check for a valid entry:
 *    - Use `some` to verify if an entry exists where:
 *      a. `code` matches the input `countryCode` (case-insensitive).
 *      b. `active` is `true`.
 *    - If no valid entry is found, log a warning and return the fallback flag URL for Vanuatu.
 *
 * 4. Construct the flag URL:
 *    - Convert `countryCode` to lowercase.
 *    - Return the URL in the format `https://flagcdn.com/w320/{countryCode}.png`.
 *
 * @param {string} countryCode - The 2-letter country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the flag URL or the fallback flag URL.
 */
export async function getFlagUrl(countryCode) {
  if (typeof countryCode !== "string" || !/^[A-Za-z]{2}$/.test(countryCode.trim())) {
    console.warn("Invalid or missing country code. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png"; // Fallback to Vanuatu flag
  }

  const countryCodeMapping = await loadCountryCodeMapping();

  const isValid = countryCodeMapping.some(
    (entry) => entry.code && entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active
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
 * @pseudocode
 * 1. Load judoka data and build a unique list of country names.
 *    - Fetch `judoka.json` and extract the `country` property from each entry.
 *    - Store the unique names in a `Set`.
 *
 * 2. Retrieve the country code mapping.
 *    - Call `loadCountryCodeMapping` to get country code/name pairs.
 *
 * 3. Filter and sort countries:
 *    - For each unique country name, find a matching entry in the mapping where
 *      `active` is `true`.
 *    - Sort the resulting list alphabetically using `localeCompare`.
 *
 * 4. Render the country buttons in batches to limit DOM nodes:
 *    - Only create DOM elements for the first 50 countries initially.
 *    - Attach a `scroll` listener to the panel's scroll container.
 *    - When scrolling near the bottom, generate the next batch of 50 until all
 *      countries are rendered.
 *    - Each button is created as follows:
 *      a. Create a `button.flag-button.slide` element, set its value, and apply
 *         an `aria-label` like "Filter by {country}" for screen readers.
 *      b. Add an `img` for the flag using `getFlagUrl` with a fallback on
 *         failure.
 *      c. Append the country name in a `p` element.
 *      d. Append the button to the container.
 *
 * 5. Handle errors:
 *    - Log any errors encountered during the process.
 *
 * @param {HTMLElement} container - The DOM element where the country list will be appended.
 */
export async function populateCountryList(container) {
  try {
    const judokaResponse = await fetch(`${DATA_DIR}judoka.json`);
    if (!judokaResponse.ok) {
      throw new Error("Failed to load judoka data");
    }
    const judoka = await judokaResponse.json();

    const uniqueCountries = new Set(
      Array.isArray(judoka) ? judoka.map((j) => j.country).filter(Boolean) : []
    );

    const countryData = await loadCountryCodeMapping();

    const activeCountries = [...uniqueCountries]
      .map((name) => countryData.find((entry) => entry.country === name && entry.active))
      .filter(Boolean)
      .sort((a, b) => a.country.localeCompare(b.country));

    const allButton = document.createElement("button");
    allButton.className = "flag-button slide";
    allButton.value = "all";
    // Include an accessible description for assistive tech
    allButton.setAttribute("aria-label", "Show all countries");
    const allImg = document.createElement("img");
    allImg.alt = "All countries";
    allImg.className = "flag-image";
    allImg.src = "https://flagcdn.com/w320/vu.png";
    const allLabel = document.createElement("p");
    allLabel.textContent = "All";
    allButton.appendChild(allImg);
    allButton.appendChild(allLabel);
    container.appendChild(allButton);

    const scrollContainer = container.parentElement || container;
    const BATCH_SIZE = 50;
    let rendered = 0;

    const renderBatch = async () => {
      const batch = activeCountries.slice(rendered, rendered + BATCH_SIZE);
      for (const country of batch) {
        if (!country.country || !country.code) {
          console.warn("Skipping invalid country entry:", country);
          continue;
        }

        const button = document.createElement("button");
        button.className = "flag-button slide";
        button.value = country.country;
        // Use an accessible label describing the filtering action
        button.setAttribute("aria-label", `Filter by ${country.country}`);

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

        const countryName = document.createElement("p");
        countryName.textContent = country.country;
        button.appendChild(flagImg);
        button.appendChild(countryName);

        container.appendChild(button);
      }
      rendered += batch.length;
    };

    await renderBatch();

    if (activeCountries.length > rendered) {
      const handleScroll = async () => {
        if (
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - SCROLL_THRESHOLD_PX
        ) {
          await renderBatch();
          if (rendered >= activeCountries.length) {
            scrollContainer.removeEventListener("scroll", handleScroll);
          }
        }
      };
      scrollContainer.addEventListener("scroll", handleScroll);
    }
  } catch (error) {
    console.error("Error fetching country data:", error);
  }
}
