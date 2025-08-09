import { fetchJson, validateWithSchema, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

const NAV_ITEMS_KEY = "navigationItems";
let schemaPromise;

async function getNavigationSchema() {
  if (!schemaPromise) {
    schemaPromise = fetch(new URL("../schemas/navigationItems.schema.json", import.meta.url))
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch navigation schema: ${r.status}`);
        }
        return r.json();
      })
      .catch(async () => importJsonModule("../schemas/navigationItems.schema.json"));
  }
  return schemaPromise;
}

/**
 * Load navigation items from localStorage or the bundled JSON file.
 *
 * @pseudocode
 * 1. Fetch `navigationItems.schema.json` lazily via `getNavigationSchema()`.
 * 2. Attempt to read `NAV_ITEMS_KEY` from `localStorage` and validate it.
 *    - On parse or validation failure, remove the stale entry.
 * 3. If no valid cached data exists, fetch `navigationItems.json` from `DATA_DIR`.
 *    - On fetch failure, dynamically import the JSON file instead.
 * 4. Persist the validated array to `localStorage` and return it.
 *
 * @returns {Promise<Array>} Resolved array of navigation items.
 */
export async function load() {
  await getNavigationSchema();
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  const raw = localStorage.getItem(NAV_ITEMS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      await validateWithSchema(parsed, await getNavigationSchema());
      return parsed;
    } catch (err) {
      console.warn("Failed to parse stored navigation items", err);
      localStorage.removeItem(NAV_ITEMS_KEY);
    }
  }
  let data;
  try {
    data = await fetchJson(`${DATA_DIR}navigationItems.json`, await getNavigationSchema());
  } catch (error) {
    console.warn("Failed to fetch navigation items, falling back to import", error);
    data = await importJsonModule("../data/navigationItems.json");
    await validateWithSchema(data, await getNavigationSchema());
  }
  localStorage.setItem(NAV_ITEMS_KEY, JSON.stringify(data));
  return data;
}

/**
 * Persist navigation items to localStorage.
 *
 * @pseudocode
 * 1. Validate `items` using the navigation schema from `getNavigationSchema()`.
 * 2. Serialize and store the array under `NAV_ITEMS_KEY` in `localStorage`.
 *
 * @param {Array} items - Array of navigation items.
 * @returns {Promise<void>} Promise that resolves when saving completes.
 */
export async function save(items) {
  await validateWithSchema(items, await getNavigationSchema());
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  localStorage.setItem(NAV_ITEMS_KEY, JSON.stringify(items));
}

/**
 * Remove cached navigation items from localStorage.
 *
 * @pseudocode
 * 1. Delete the `NAV_ITEMS_KEY` entry from `localStorage` when available.
 */
export function reset() {
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  localStorage.removeItem(NAV_ITEMS_KEY);
}
