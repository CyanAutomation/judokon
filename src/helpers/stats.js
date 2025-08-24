import { fetchJson, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { debugLog } from "./debug.js";

let namesPromise;
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
 * 1. Check if `cachedNames` (the array of stat definitions) is already populated.
 * 2. If `cachedNames` is not populated:
 *    a. Check if `namesPromise` (the promise for fetching stat names) is not already initiated.
 *    b. If `namesPromise` is not initiated:
 *       i. Initiate `namesPromise` by calling `fetchJson` to get `statNames.json`.
 *       ii. Attach a `catch` block to `namesPromise` to handle potential errors during fetching:
 *           1. Log a debug message indicating the failure to load stat names.
 *           2. As a fallback, attempt to import `statNames.json` directly as a module using `importJsonModule`.
 *           3. If even the module import fails, return an empty array `[]` to prevent further errors.
 *    c. Await the resolution of `namesPromise` to get the fetched (or fallback) data.
 *    d. Sort the fetched data by `statIndex` and store it in `cachedNames`.
 *    e. Create `labelMap` by transforming `cachedNames` into an object where keys are slugified stat names and values are original stat names.
 * 3. Filter `cachedNames` to return only the entries whose `category` matches the provided `category` (defaulting to "Judo").
 *
 * @param {string} [category="Judo"] - Category of stats to load.
 * @returns {Promise<Array<{id:number,statIndex:number,name:string,category:string,japanese:string,description:string}>>} Sorted stat objects.
 */
export async function loadStatNames(category = "Judo") {
  if (!cachedNames) {
    if (!namesPromise) {
      namesPromise = fetchJson(`${DATA_DIR}statNames.json`).catch(async (err) => {
        // Use debug logging to avoid noisy browser error output in tests/CI
        debugLog("Failed to load stat names:", err);
        // Fallback to module import so tests/dev still function when fetch fails.
        try {
          return await importJsonModule("../data/statNames.json");
        } catch {
          return [];
        }
      });
    }
    cachedNames = (await namesPromise).sort((a, b) => a.statIndex - b.statIndex);
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
