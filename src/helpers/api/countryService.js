import { fetchJson, importJsonModule } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";
import { getItem, setItem } from "../storage.js";
import { debugLog } from "../debug.js";

const STORAGE_KEY = "countryCodeMapping";
const DEFAULT_COUNTRY = "Vanuatu";
const DEFAULT_FLAG_URL = "https://flagcdn.com/w320/vu.png";

let mapping;
let mappingPromise;

/**
 * Load the country code mapping with caching and persistence.
 *
 * @pseudocode
 * 1. If `mapping` (in-memory cache) is already populated, return it immediately.
 * 2. If `mappingPromise` (a pending fetch operation) is not already initiated:
 *    a. Start a new asynchronous operation for `mappingPromise`:
 *       i. Attempt to retrieve cached data from local storage using `getItem(STORAGE_KEY)`.
 *       ii. If cached data exists, return it.
 *       iii. If no cached data, attempt to fetch `countryCodeMapping.json` from `DATA_DIR` using `fetchJson()`.
 *       iv. If fetching succeeds, store the data in local storage using `setItem(STORAGE_KEY, data)` and return the data.
 *       v. If fetching fails (in the `catch` block):
 *          1. Log a debug message about the fetch failure.
 *          2. As a fallback, attempt to import `countryCodeMapping.json` directly as a local module using `importJsonModule()`.
 *          3. Store this fallback data in local storage using `setItem(STORAGE_KEY, data)` and return it.
 * 3. Await the resolution of `mappingPromise` to get the loaded (or fallback) mapping data.
 * 4. Store the resolved data in `mapping` (in-memory cache).
 * 5. Return the `mapping` object.
 *
 * @returns {Promise<Record<string, {code: string, country: string, active: boolean}>>}
 *   Mapping keyed by country code.
 */
export async function loadCountryMapping() {
  if (mapping) return mapping;
  if (!mappingPromise) {
    mappingPromise = (async () => {
      const cached = getItem(STORAGE_KEY);
      if (cached) return cached;
      try {
        const data = await fetchJson(`${DATA_DIR}countryCodeMapping.json`);
        setItem(STORAGE_KEY, data);
        return data;
      } catch (err) {
        // Reduce noise in tests/CI: prefer debug logging over warnings
        // and fall back to local module import.
        debugLog("Failed to fetch countryCodeMapping.json", err);
        const data = await importJsonModule("../../data/countryCodeMapping.json");
        setItem(STORAGE_KEY, data);
        return data;
      }
    })();
  }
  mapping = await mappingPromise;
  return mapping;
}

/**
 * Normalizes a two-letter country code by trimming whitespace, converting to lowercase,
 * and validating it against a two-letter alphabetic pattern.
 *
 * @private
 * @param {*} code - The input country code, can be of any type.
 * @returns {string|undefined} The normalized two-letter country code, or `undefined` if invalid.
 * @pseudocode
 * 1. Check if `code` is not a string. If so, return `undefined`.
 * 2. Trim whitespace from `code` and convert it to lowercase.
 * 3. Test the `normalized` string against a regular expression `^[a-z]{2}import { fetchJson, importJsonModule } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";
import { getItem, setItem } from "../storage.js";
import { debugLog } from "../debug.js";

const STORAGE_KEY = "countryCodeMapping";
const DEFAULT_COUNTRY = "Vanuatu";
const DEFAULT_FLAG_URL = "https://flagcdn.com/w320/vu.png";

let mapping;
let mappingPromise;

/**
 * Load the country code mapping with caching and persistence.
 *
 * @pseudocode
 * 1. If `mapping` (in-memory cache) is already populated, return it immediately.
 * 2. If `mappingPromise` (a pending fetch operation) is not already initiated:
 *    a. Start a new asynchronous operation for `mappingPromise`:
 *       i. Attempt to retrieve cached data from local storage using `getItem(STORAGE_KEY)`.
 *       ii. If cached data exists, return it.
 *       iii. If no cached data, attempt to fetch `countryCodeMapping.json` from `DATA_DIR` using `fetchJson()`.
 *       iv. If fetching succeeds, store the data in local storage using `setItem(STORAGE_KEY, data)` and return the data.
 *       v. If fetching fails (in the `catch` block):
 *          1. Log a debug message about the fetch failure.
 *          2. As a fallback, attempt to import `countryCodeMapping.json` directly as a local module using `importJsonModule()`.
 *          3. Store this fallback data in local storage using `setItem(STORAGE_KEY, data)` and return it.
 * 3. Await the resolution of `mappingPromise` to get the loaded (or fallback) mapping data.
 * 4. Store the resolved data in `mapping` (in-memory cache).
 * 5. Return the `mapping` object.
 *
 * @returns {Promise<Record<string, {code: string, country: string, active: boolean}>>}
 *   Mapping keyed by country code.
 */
export async function loadCountryMapping() {
  if (mapping) return mapping;
  if (!mappingPromise) {
    mappingPromise = (async () => {
      const cached = getItem(STORAGE_KEY);
      if (cached) return cached;
      try {
        const data = await fetchJson(`${DATA_DIR}countryCodeMapping.json`);
        setItem(STORAGE_KEY, data);
        return data;
      } catch (err) {
        // Reduce noise in tests/CI: prefer debug logging over warnings
        // and fall back to local module import.
        debugLog("Failed to fetch countryCodeMapping.json", err);
        const data = await importJsonModule("../../data/countryCodeMapping.json");
        setItem(STORAGE_KEY, data);
        return data;
      }
    })();
  }
  mapping = await mappingPromise;
  return mapping;
}

 to ensure it consists of exactly two lowercase alphabetic characters.
 * 4. If the test passes, return the `normalized` string; otherwise, return `undefined`.
 */
function normalizeCode(code) {
  if (typeof code !== "string") return undefined;
  const normalized = code.trim().toLowerCase();
  return /^[a-z]{2}$/.test(normalized) ? normalized : undefined;
}

/**
 * Resolve the country name for a two-letter code.
 *
 * @pseudocode
 * 1. Normalize `code`; return `DEFAULT_COUNTRY` when invalid.
 * 2. Load the country mapping.
 * 3. Retrieve the entry for the normalized code.
 * 4. Return the entry's `country` when active; otherwise `DEFAULT_COUNTRY`.
 *
 * @param {string} code - Two-letter country code.
 * @returns {Promise<string>} Resolved country name or default.
 */
export async function getCountryName(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return DEFAULT_COUNTRY;
  const map = await loadCountryMapping();
  const entry = map[normalized];
  return entry && entry.active ? entry.country : DEFAULT_COUNTRY;
}

/**
 * Build the flag image URL for a country code.
 *
 * @pseudocode
 * 1. Normalize `code`; return `DEFAULT_FLAG_URL` when invalid.
 * 2. Load the country mapping.
 * 3. If mapping contains an active entry for the code, return the CDN URL.
 * 4. Otherwise return `DEFAULT_FLAG_URL`.
 *
 * @param {string} code - Two-letter country code.
 * @returns {Promise<string>} URL for the flag image.
 */
export async function getFlagUrl(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return DEFAULT_FLAG_URL;
  const map = await loadCountryMapping();
  if (map[normalized] && map[normalized].active) {
    return `https://flagcdn.com/w320/${normalized}.png`;
  }
  return DEFAULT_FLAG_URL;
}
