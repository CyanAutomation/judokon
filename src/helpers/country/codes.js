import { debugLog } from "../debug.js";
import { DATA_DIR } from "../constants.js";

/** @typedef {{country: string, code: string, lastUpdated: string, active: boolean}} CountryEntry */

/** @type {Record<string, CountryEntry>|null} */
let countryCodeMappingCache = null;
const COUNTRY_CACHE_KEY = "countryCodeMappingCache";

/**
 * Load the mapping of country codes to country names.
 *
 * @pseudocode
 * 1. Return cached data when available, including localStorage cache.
 * 2. Fetch `countryCodeMapping.json` from `DATA_DIR` when no cache exists.
 * 3. Validate each `[code, entry]` pair:
 *    - Ensure `code` is lowercase two-letter ISO.
 *    - Verify `entry.code` matches the key and required fields exist.
 *    - Throw an error on invalid data.
 * 4. Cache the mapping in memory and localStorage, then return it.
 *
 * @returns {Promise<Record<string, CountryEntry>>} Mapping data.
 */
export async function loadCountryCodeMapping() {
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
  for (const [code, entry] of Object.entries(data)) {
    if (!/^[a-z]{2}$/.test(code)) {
      throw new Error(`Invalid country code key: "${code}"`);
    }
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid entry for code "${code}": not an object`);
    }
    if (entry.code !== code) {
      throw new Error(`Code mismatch for key "${code}": entry.code is "${entry.code}"`);
    }
    if (
      typeof entry.country !== "string" ||
      typeof entry.active !== "boolean" ||
      typeof entry.lastUpdated !== "string"
    ) {
      throw new Error(`Invalid country code entry found for "${code}"`);
    }
  }
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
 * Resolve the country name for a two-letter code.
 *
 * @pseudocode
 * 1. Validate that `code` is a two-letter string; return "Vanuatu" when invalid.
 * 2. Attempt to load the mapping via `loadCountryCodeMapping()`; return "Vanuatu" on failure.
 * 3. Look up the lower-cased `code` and return the `country` when the entry is active.
 * 4. Default to "Vanuatu" if no matching active entry is found.
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
    const entry = countryCodeMapping[code.toLowerCase()];
    const result = entry && entry.active ? entry.country : "Vanuatu";
    debugLog(`Resolved country name for code "${code}":`, result);
    return result;
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
    const entry = countryCodeMapping[countryCode.toLowerCase()];
    if (!entry || !entry.active) {
      console.warn("Invalid country code. Defaulting to Vanuatu flag.");
      return "https://flagcdn.com/w320/vu.png";
    }
    return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
  } catch {
    console.warn("Failed to load country code mapping. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png";
  }
}
