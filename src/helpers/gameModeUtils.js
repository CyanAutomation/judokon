import { fetchJson, validateWithSchema, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { load as loadNavCache, save as saveNavCache } from "./navigationCache.js";
import { getItem, setItem, removeItem } from "./storage.js";
import navFallback from "../data/navigationItems.json";

/**
 * The game modes JSON schema is loaded on demand. This avoids fetching the
 * schema during module initialization.
 */
let schemaPromise;

async function getSchema() {
  if (!schemaPromise) {
    schemaPromise = fetch(new URL("../schemas/gameModes.schema.json", import.meta.url))
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch game modes schema: ${r.status}`);
        }
        return r.json();
      })
      .catch(async () => importJsonModule("../schemas/gameModes.schema.json"));
  }
  return schemaPromise;
}

const GAMEMODES_KEY = "gameModes";

/**
 * Load game modes from storage or fallback to the default game modes JSON file.
 *
 * @pseudocode
 * 1. Call `getSchema()` to lazily load the validation schema.
 * 2. Attempt to read `GAMEMODES_KEY` from storage.
 *    - Parse and validate the JSON when present.
 * 3. If no stored data exists, attempt to fetch `gameModes.json` from `DATA_DIR`.
 *    - On failure, dynamically import the JSON file instead.
 *    - Persist the resolved array to storage.
 * 4. Return the validated array of game mode objects.
 *
 * @returns {Promise<import("./types.js").GameMode[]>} Resolved array of game mode objects.
 */
export async function loadGameModes() {
  await getSchema();
  const cached = getItem(GAMEMODES_KEY);
  if (cached) {
    try {
      await validateWithSchema(cached, await getSchema());
      return cached;
    } catch (err) {
      console.warn("Failed to validate stored game modes", err);
      removeItem(GAMEMODES_KEY);
    }
  }
  let data;
  try {
    data = await fetchJson(`${DATA_DIR}gameModes.json`, await getSchema());
  } catch (error) {
    console.warn("Failed to fetch game modes, falling back to import", error);
    data = await importJsonModule("../data/gameModes.json");
    await validateWithSchema(data, await getSchema());
  }
  setItem(GAMEMODES_KEY, data);
  return data;
}

/**
 * Load navigation items merged with game mode data, with robust error handling and fallback.
 *
 * @pseudocode
 * 1. Attempt to load navigation items from cache via `loadNavCache()`.
 * 2. On failure, dynamically import `navigationItems.json`; if that also fails, use statically imported `navFallback`.
 * 3. Load game modes with `loadGameModes()` and fall back to a dynamic import of `gameModes.json` on failure.
 * 4. If either data set cannot be recovered, throw an error so callers can surface a global failure.
 * 5. Merge navigation items with corresponding game mode data and return the result.
 *
 * @returns {Promise<Array>} Array of merged navigation and game mode objects.
 */
export async function loadNavigationItems() {
  let navItems, modes;
  try {
    navItems = await loadNavCache();
  } catch (err) {
    console.error("Failed to load navigationItems from cache or JSON:", err);
    try {
      navItems = await importJsonModule("../data/navigationItems.json");
    } catch (fallbackErr) {
      console.error("Fallback navigationItems import failed:", fallbackErr);
      navItems = navFallback;
    }
  }
  try {
    modes = await loadGameModes();
  } catch (err) {
    console.error("Failed to load gameModes from cache or JSON:", err);
    try {
      modes = await importJsonModule("../data/gameModes.json");
    } catch (fallbackErr) {
      console.error("Fallback gameModes import failed:", fallbackErr);
      modes = null;
    }
  }
  if (!Array.isArray(navItems) || !Array.isArray(modes)) {
    throw new Error("Navigation or game mode data is unavailable");
  }
  return navItems.map((item) => {
    const mode = modes.find((m) => m.id === Number(item.gameModeId)) || {};
    return { ...mode, ...item };
  });
}

/**
 * Persist an array of game modes to storage.
 *
 * @pseudocode
 * 1. Call `getSchema()` to lazily load the schema.
 * 2. Validate the provided `modes` with the schema.
 * 3. Serialize the array and store it under `GAMEMODES_KEY`.
 *
 * @param {import("./types.js").GameMode[]} modes - Array of game mode objects.
 * @returns {Promise<void>} Promise that resolves when saving completes.
 */
export async function saveGameModes(modes) {
  await validateWithSchema(modes, await getSchema());
  setItem(GAMEMODES_KEY, modes);
}

/**
 * Update the `isHidden` value for a specific navigation item.
 *
 * @pseudocode
 * 1. Load the current navigation items using `navigationCache.load()`.
 * 2. Find the item matching `id` and update its `isHidden` property.
 *    - Throw an error if the item is not found.
 * 3. Validate and persist the updated array with `navigationCache.save()`.
 * 4. Return the merged navigation items, ensuring navigation item properties
 *    override game mode properties.
 *
 * @param {number} id - Identifier of the navigation item to update.
 * @param {boolean} isHidden - New hidden state for the item.
 * @returns {Promise<Array>} Updated array of merged items.
 */
export async function updateNavigationItemHidden(id, isHidden) {
  const items = await loadNavCache();
  const numericId = Number(id);
  const index = items.findIndex((m) => Number(m.id) === numericId);
  if (index === -1) {
    throw new Error(`Navigation item not found: ${id}`);
  }
  items[index] = { ...items[index], isHidden };
  await saveNavCache(items);
  const modes = await loadGameModes();
  return items.map((item) => {
    const mode = modes.find((m) => m.id === Number(item.gameModeId)) || {};
    return { ...mode, ...item };
  });
}

/**
 * Retrieve a game mode object by its ID.
 *
 * @pseudocode
 * 1. Load all navigation items using `loadNavigationItems()`.
 * 2. Find and return the item with the matching `id`.
 *    - If not found, return `undefined`.
 *
 * @param {number} id - The ID of the navigation item to retrieve.
 * @returns {Promise<import("./types.js").GameMode|undefined>} The merged item or undefined if not found.
 */
export async function getGameModeById(id) {
  const numericId = Number(id);
  const modes = await loadNavigationItems();
  return modes.find((m) => Number(m.id) === numericId);
}

/**
 * Validate a destination URL for a game mode. Logs an error and optionally redirects if invalid.
 *
 * @pseudocode
 * 1. Check if the provided URL is a non-empty string and matches a known navigation URL.
 * 2. If valid, return true.
 * 3. If invalid, log an error and optionally redirect to a default error page.
 *
 * @param {string} url - The destination URL to validate.
 * @param {boolean} [redirect=false] - Whether to redirect to error page if invalid.
 * @returns {Promise<boolean>} True if valid, false otherwise.
 */
export async function validateGameModeUrl(url, redirect = false) {
  if (typeof url !== "string" || !url) {
    console.error("Invalid or empty navigation URL");
    if (redirect) window.location.href = "/src/pages/error.html";
    return false;
  }
  const modes = await loadNavigationItems();
  const valid = modes.some((m) => m.url === url);
  if (!valid) {
    console.error(`Broken destination URL: ${url}`);
    if (redirect) window.location.href = "/src/pages/error.html";
    return false;
  }
  return true;
}
