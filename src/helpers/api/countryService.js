import { fetchJson, importJsonModule } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";
import { getItem, setItem } from "../storage.js";

const STORAGE_KEY = "countryCodeMapping";
const DEFAULT_COUNTRY = "Vanuatu";
const DEFAULT_FLAG_URL = "https://flagcdn.com/w320/vu.png";

let mapping;
let mappingPromise;

/**
 * Load the country code mapping with caching and persistence.
 *
 * @pseudocode
 * 1. Return cached `mapping` when available.
 * 2. If no pending `mappingPromise`:
 *    a. Attempt to read mapping from storage.
 *    b. When missing, fetch `${DATA_DIR}countryCodeMapping.json`.
 *       - On failure, import the local JSON module.
 *    c. Persist the mapping to storage.
 * 3. Await and store the loaded mapping.
 * 4. Return the mapping object.
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

        if (typeof window !== "undefined" && window.DEBUG_LOGGING) {
          console.log("Failed to fetch countryCodeMapping.json", err);
        }
        const data = await importJsonModule("../../data/countryCodeMapping.json");
        setItem(STORAGE_KEY, data);
        return data;
      }
    })();
  }
  mapping = await mappingPromise;
  return mapping;
}

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
