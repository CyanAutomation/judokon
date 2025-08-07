import { fetchJson, validateWithSchema, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

/**
 * The game modes JSON schema is loaded on demand. This avoids fetching the
 * schema during module initialization.
 */
let schemaPromise;
let navSchemaPromise;

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

async function getNavigationSchema() {
  if (!navSchemaPromise) {
    navSchemaPromise = fetch(new URL("../schemas/navigationItems.schema.json", import.meta.url))
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch navigation schema: ${r.status}`);
        }
        return r.json();
      })
      .catch(async () => importJsonModule("../schemas/navigationItems.schema.json"));
  }
  return navSchemaPromise;
}

const GAMEMODES_KEY = "gameModes";
const NAV_ITEMS_KEY = "navigationItems";

/**
 * Load game modes from localStorage or fallback to the default game modes JSON file.
 *
 * @pseudocode
 * 1. Call `getSchema()` to lazily load the validation schema.
 * 2. Attempt to read `GAMEMODES_KEY` from `localStorage`.
 *    - Parse and validate the JSON when present.
 * 3. If no stored data exists, attempt to fetch `gameModes.json` from `DATA_DIR`.
 *    - On failure, dynamically import the JSON file instead.
 *    - Persist the resolved array to `localStorage`.
 * 4. Return the validated array of game mode objects.
 *
 * @returns {Promise<import("./types.js").GameMode[]>} Resolved array of game mode objects.
 */
export async function loadGameModes() {
  await getSchema();
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  const raw = localStorage.getItem(GAMEMODES_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      await validateWithSchema(parsed, await getSchema());
      return parsed;
    } catch (err) {
      console.warn("Failed to parse stored game modes", err);
      localStorage.removeItem(GAMEMODES_KEY);
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
  localStorage.setItem(GAMEMODES_KEY, JSON.stringify(data));
  return data;
}

/**
 * Load raw navigation items from storage or the bundled JSON file.
 *
 * @returns {Promise<Array>} Resolved array of navigation items.
 */
async function loadRawNavigationItems() {
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
 * Load navigation items merged with game mode data.
 *
 * @pseudocode
 * 1. Retrieve raw navigation items via `loadRawNavigationItems()`.
 * 2. Retrieve game modes via `loadGameModes()`.
 * 3. Ensure both results are arrays; throw if validation fails.
 * 4. Merge each navigation item with its corresponding game mode by `gameModeId`,
 *    with navigation item properties taking precedence.
 * 5. Return the merged array.
 *
 * @returns {Promise<Array>} Array of merged navigation and game mode objects.
 */
export async function loadNavigationItems() {
  const navItems = await loadRawNavigationItems();
  const modes = await loadGameModes();
  if (!Array.isArray(navItems) || !Array.isArray(modes)) {
    throw new Error("Invalid navigation or game mode data");
  }
  return navItems.map((item) => {
    const mode = modes.find((m) => m.id === Number(item.gameModeId)) || {};
    return { ...mode, ...item };
  });
}

/**
 * Persist an array of game modes to localStorage.
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
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  localStorage.setItem(GAMEMODES_KEY, JSON.stringify(modes));
}

async function saveNavigationItems(items) {
  await validateWithSchema(items, await getNavigationSchema());
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  localStorage.setItem(NAV_ITEMS_KEY, JSON.stringify(items));
}

/**
 * Update the `isHidden` value for a specific navigation item.
 *
 * @pseudocode
 * 1. Load the current navigation items using `loadRawNavigationItems()`.
 * 2. Find the item matching `id` and update its `isHidden` property.
 *    - Throw an error if the item is not found.
 * 3. Validate and persist the updated array with `saveNavigationItems()`.
 * 4. Return the merged navigation items, ensuring navigation item properties
 *    override game mode properties.
 *
 * @param {number} id - Identifier of the navigation item to update.
 * @param {boolean} isHidden - New hidden state for the item.
 * @returns {Promise<Array>} Updated array of merged items.
 */
export async function updateNavigationItemHidden(id, isHidden) {
  await getNavigationSchema();
  const items = await loadRawNavigationItems();
  const numericId = Number(id);
  const index = items.findIndex((m) => Number(m.id) === numericId);
  if (index === -1) {
    throw new Error(`Navigation item not found: ${id}`);
  }
  items[index] = { ...items[index], isHidden };
  await saveNavigationItems(items);
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
