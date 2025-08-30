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
 * 1. If `mapping` (in-memory cache) exists, return it.
 * 2. If no `mappingPromise`, start loading from storage or network/module.
 * 3. On success, persist to storage and cache in memory.
 * 4. Await `mappingPromise`, assign to `mapping`, and return it.
 *
 * @returns {Promise<Record<string, {code: string, country: string, active: boolean}>>}
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
        // Prefer debug logs in tests/CI to reduce noise.
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
 * Normalize a two-letter ISO country code.
 *
 * @pseudocode
 * 1. If not a string, return undefined.
 * 2. Trim and lowercase.
 * 3. If it matches /^[a-z]{2}$/, return it; else undefined.
 *
 * @param {*} code
 * @returns {string|undefined}
 */
function normalizeCode(code) {
  if (typeof code !== "string") return undefined;
  const normalized = code.trim().toLowerCase();
  return /^[a-z]{2}$/.test(normalized) ? normalized : undefined;
}

/**
 * Resolve the country name for a code.
 *
 * @param {string} code
 * @returns {Promise<string>}
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Resolve a human-readable country name for a two-letter code.
 *
 * @summary Return the country name for `code`, falling back to a default when unknown.
 * @pseudocode
 * 1. Normalize the provided code.
 * 2. If invalid, return `DEFAULT_COUNTRY`.
 * 3. Load the country mapping and return the matching active entry's name.
 * 4. Fallback to `DEFAULT_COUNTRY` when no active mapping exists.
 *
 * @param {string} code - Two-letter ISO country code.
 * @returns {Promise<string>} The resolved country name.
 */
export async function getCountryName(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return DEFAULT_COUNTRY;
  const map = await loadCountryMapping();
  const entry = map[normalized];
  return entry && entry.active ? entry.country : DEFAULT_COUNTRY;
}

/**
 * Build the flag URL for a code.
 *
 * @param {string} code
 * @returns {Promise<string>}
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Build or resolve a flag image URL for a two-letter country code.
 *
 * @summary Return a CDN URL for the flag matching `code` or a default image URL.
 * @pseudocode
 * 1. Normalize the provided code.
 * 2. If invalid, return `DEFAULT_FLAG_URL`.
 * 3. Load the country mapping and return a flag URL when the entry is active.
 * 4. Otherwise return `DEFAULT_FLAG_URL`.
 *
 * @param {string} code - Two-letter ISO country code.
 * @returns {Promise<string>} URL of the flag image.
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
