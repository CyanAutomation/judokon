import statNamesData from "../data/statNames.js";

let cachedNames;
let labelMap;

/**
 * Converts a string into a "slug" format: lowercase with spaces and hyphens removed.
 * This is typically used for creating URL-friendly identifiers or keys.
 *
 * @private
 * @param {string} name - The input string to convert.
 * @returns {string} The slugified string.
 * @pseudocode
 * 1. Convert the input `name` to lowercase.
 * 2. Replace all occurrences of hyphens (`-`) or whitespace characters (`\s`) with an empty string.
 * 3. Return the resulting string.
 */
function slug(name) {
  return name.toLowerCase().replace(/[-\s]/g, "");
}

/**
 * Load stat definitions once and return those matching the category.
 *
 * @pseudocode
 * 1. Initialize `cachedNames` and `labelMap` on first call using the stat name module.
 * 2. Sort the stat definitions by `statIndex` and build a slug to label map.
 * 3. Filter the cached names by `category` (defaulting to "Judo").
 *
 * @param {string} [category="Judo"] - Category of stats to load.
 * @returns {Promise<Array<{id:number,statIndex:number,name:string,category:string,japanese:string,description:string}>>} Sorted stat objects.
 */
export async function loadStatNames(category = "Judo") {
  if (!cachedNames) {
    cachedNames = statNamesData.slice().sort((a, b) => a.statIndex - b.statIndex);
    labelMap = Object.fromEntries(cachedNames.map((s) => [slug(s.name), s.name]));
  }
  return cachedNames.filter((s) => s.category === category);
}

/**
 * Get the English label for a stat key.
 *
 * @pseudocode
 * 1. Ensure stat data is loaded with `loadStatNames()`.
 * 2. Look up the key in the cached label map.
 * 3. Return the mapped label or an empty string when missing.
 *
 * @param {string} key - Stat key like `power` or `speed`.
 * @returns {Promise<string>} English label for the stat or empty string.
 */
export async function getStatLabel(key) {
  if (!labelMap) await loadStatNames();
  return labelMap[key] || "";
}
