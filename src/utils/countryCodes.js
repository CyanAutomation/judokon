import { fetchJson, importJsonModule } from "../helpers/dataUtils.js";
import { DATA_DIR } from "../helpers/constants.js";

/**
 * Utilities for working with two-letter ISO country codes backed by a
 * dictionary mapping. The data file `countryCodeMapping.json` stores entries
 * keyed by code, enabling direct lookups without array traversal.
 *
 * @example
 * import { getCountryByCode, getCodeByCountry, listCountries } from "./countryCodes.js";
 * const name = await getCountryByCode("fr"); // "France"
 * const code = await getCodeByCountry("Japan"); // "jp"
 * const countries = await listCountries(); // ["Brazil", "France", "Japan", ...]
 */
/**
 * @typedef {import("../helpers/types.js").CountryCodeEntry} CountryCodeEntry
 * @exports CountryCodeEntry
 */
let mapping;
let mappingPromise;

async function loadMapping() {
  if (mapping) return mapping;
  if (!mappingPromise) {
    mappingPromise = fetchJson(`${DATA_DIR}countryCodeMapping.json`).catch(async (err) => {
      console.warn("Failed to fetch countryCodeMapping.json", err);
      return importJsonModule("../data/countryCodeMapping.json");
    });
  }
  mapping = await mappingPromise;
  return mapping;
}

/**
 * Normalize a two-letter country code to lowercase.
 *
 * @pseudocode
 * 1. Return `undefined` when `code` is not a string.
 * 2. Trim whitespace and convert to lowercase.
 * 3. If the result matches `/^[a-z]{2}$/`, return it.
 * 4. Otherwise, return `undefined`.
 *
 * @param {string} code - Input country code.
 * @returns {string|undefined} Normalized code or undefined when invalid.
 */
export function normalizeCode(code) {
  if (typeof code !== "string") return undefined;
  const normalized = code.trim().toLowerCase();
  return /^[a-z]{2}$/.test(normalized) ? normalized : undefined;
}

/**
 * Lookup the country name for a given code.
 *
 * @pseudocode
 * 1. Normalize `code`; return `undefined` when invalid.
 * 2. Load the country code mapping.
 * 3. Retrieve the entry for the normalized code.
 * 4. Return `entry.country` when the entry exists and is active.
 * 5. Otherwise, return `undefined`.
 *
 * @param {string} code - Two-letter country code.
 * @returns {Promise<string|undefined>} Resolved country name or undefined.
 *
 * @example
 * const name = await getCountryByCode("fr");
 * console.log(name); // "France"
 */
export async function getCountryByCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return undefined;
  const map = await loadMapping();
  const entry = map[normalized];
  return entry && entry.active ? entry.country : undefined;
}

/**
 * Find the country code for a given country name.
 *
 * @pseudocode
 * 1. Verify `country` is a non-empty string; return `undefined` otherwise.
 * 2. Load the country code mapping.
 * 3. Iterate through mapping values and find an active entry whose
 *    `country` matches case-insensitively.
 * 4. Return the entry's `code` when found; otherwise, `undefined`.
 *
 * @param {string} country - Country name to search.
 * @returns {Promise<string|undefined>} Resolved code or undefined.
 *
 * @example
 * const code = await getCodeByCountry("Japan");
 * console.log(code); // "jp"
 */
export async function getCodeByCountry(country) {
  if (typeof country !== "string" || !country.trim()) return undefined;
  const map = await loadMapping();
  const lower = country.trim().toLowerCase();
  for (const entry of Object.values(map)) {
    if (entry.active && entry.country.toLowerCase() === lower) {
      return entry.code;
    }
  }
  return undefined;
}

/**
 * Convert the mapping to a sorted array of active entries.
 *
 * @pseudocode
 * 1. Load the country code mapping.
 * 2. Convert `Object.values` of the mapping to an array.
 * 3. Filter only active entries.
 * 4. Sort by `country` name.
 * 5. Return the resulting array.
 *
 * @returns {Promise<Array<CountryCodeEntry>>} Sorted active entries.
 */
export async function toArray() {
  const map = await loadMapping();
  return Object.values(map)
    .filter((entry) => entry.active)
    .sort((a, b) => a.country.localeCompare(b.country));
}

/**
 * List all active country names.
 *
 * @pseudocode
 * 1. Call `toArray()` to obtain active entries.
 * 2. Map each entry to its `country` name.
 * 3. Return the array of names.
 *
 * @returns {Promise<Array<string>>} Sorted list of country names.
 *
 * @example
 * const countries = await listCountries();
 * console.log(countries); // ["Brazil", "France", "Japan", ...]
 */
export async function listCountries() {
  const entries = await toArray();
  return entries.map((e) => e.country);
}
