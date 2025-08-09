import { debugLog } from "../debug.js";
import { DATA_DIR } from "../constants.js";
import { getItem, setItem } from "../storage.js";

let countryCodeMappingCache = null;
const COUNTRY_CACHE_KEY = "countryCodeMappingCache";

/**
 * Load the mapping of country codes to country names.
 *
 * @pseudocode
 * 1. Return cached data when available, including persisted storage cache.
 * 2. Fetch `countryCodeMapping.json` from `DATA_DIR` when no cache exists.
 * 3. Validate each entry and log warnings for invalid data.
 * 4. Store the result in memory and persistent storage, then return the mapping.
 *
 * @returns {Promise<Array<{country:string,code:string,active:boolean}>>} Mapping data.
 */
export async function loadCountryCodeMapping() {
  if (countryCodeMappingCache) {
    return countryCodeMappingCache;
  }
  const cached = getItem(COUNTRY_CACHE_KEY);
  if (cached) {
    countryCodeMappingCache = cached;
    return countryCodeMappingCache;
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
  setItem(COUNTRY_CACHE_KEY, data);
  return data;
}

/**
 * Resolve the country name for a two-letter code.
 *
 * @pseudocode
 * 1. Validate that `code` is a two-letter string; return "Vanuatu" when invalid.
 * 2. Attempt to load the mapping via `loadCountryCodeMapping()`; return "Vanuatu" on failure.
 * 3. Find the matching active entry and return its country name.
 * 4. Default to "Vanuatu" if no match is found.
 *
 * @param {string} code - Two-letter country code.
 * @returns {Promise<string>} Resolved country name or fallback.
 */
export async function getCountryNameFromCode(code) {
  if (typeof code !== "string" || !/^[A-Za-z]{2}$/.test(code.trim())) {
    console.warn("Invalid country code format. Expected a 2-letter code.");
    return "Vanuatu";
  }
  try {
    const countryCodeMapping = await loadCountryCodeMapping();
    const match = countryCodeMapping.find(
      (entry) => entry.code.toLowerCase() === code.toLowerCase() && entry.active
    );
    debugLog(`Resolved country name for code "${code}":`, match ? match.country : "Vanuatu");
    return match ? match.country : "Vanuatu";
  } catch {
    console.warn("Failed to load country code mapping. Defaulting to Vanuatu.");
    return "Vanuatu";
  }
}

/**
 * Build the flag image URL for a country code.
 *
 * @pseudocode
 * 1. Validate `countryCode` as a two-letter string; return the Vanuatu flag when invalid.
 * 2. Attempt to load the mapping and verify the code exists and is active; return the Vanuatu flag on failure.
 * 3. Return the CDN URL using the lower-cased code or the Vanuatu flag when invalid.
 *
 * @param {string} countryCode - Two-letter country code.
 * @returns {Promise<string>} URL for the flag image.
 */
export async function getFlagUrl(countryCode) {
  if (typeof countryCode !== "string" || !/^[A-Za-z]{2}$/.test(countryCode.trim())) {
    console.warn("Invalid or missing country code. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png";
  }
  try {
    const countryCodeMapping = await loadCountryCodeMapping();
    const isValid = countryCodeMapping.some(
      (entry) =>
        entry.code && entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active
    );
    if (!isValid) {
      console.warn("Invalid country code. Defaulting to Vanuatu flag.");
      return "https://flagcdn.com/w320/vu.png";
    }
    return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
  } catch {
    console.warn("Failed to load country code mapping. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png";
  }
}
