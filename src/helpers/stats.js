import { fetchJson, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

let namesPromise;
let cachedNames;
let labelMap;

function slug(name) {
  return name.toLowerCase().replace(/[-\s]/g, "");
}

/**
 * Load stat definitions once and return those matching the category.
 *
 * @pseudocode
 * 1. When cached data exists, filter by `category` and return it.
 * 2. Otherwise fetch `statNames.json` via `fetchJson` and cache the promise.
 * 3. Sort the data by `statIndex` and store a lookup of slugified names.
 * 4. Return the entries matching `category`.
 *
 * @param {string} [category="Judo"] - Category of stats to load.
 * @returns {Promise<Array<{id:number,statIndex:number,name:string,category:string,japanese:string,description:string}>>} Sorted stat objects.
 */
export async function loadStatNames(category = "Judo") {
  if (!cachedNames) {
    if (!namesPromise) {
      namesPromise = fetchJson(`${DATA_DIR}statNames.json`).catch(async (err) => {
        // Use debug logging to avoid noisy browser error output in tests/CI
        try {
          const { debugLog } = await import("./debug.js");
          debugLog("Failed to load stat names:", err);
        } catch {}
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
