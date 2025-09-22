import { fetchJson, validateWithSchema, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { getItem, setItem, removeItem } from "./storage.js";
import navigationFallback from "../data/navigationItems.js";
import * as navigationCache from "./navigationCache.js";

/**
 * The game modes JSON schema is loaded on demand. This avoids fetching the
 * schema during module initialization.
 */
let schemaPromise;
let navigationSchemaPromise;

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
  if (!navigationSchemaPromise) {
    navigationSchemaPromise = fetch(
      new URL("../schemas/navigationItems.schema.json", import.meta.url)
    )
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch navigation items schema: ${r.status}`);
        }
        return r.json();
      })
      .catch(async () => importJsonModule("../schemas/navigationItems.schema.json"));
  }
  return navigationSchemaPromise;
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

function cloneNavigationItems(items) {
  return Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
}

/**
 * Load navigation entries and enrich them with game mode metadata.
 *
 * @pseudocode
 * 1. Resolve the navigation schema via `getNavigationSchema()`.
 * 2. Attempt to load cached navigation items using `navigationCache.load()`.
 *    - On failure, log the error and fall back to the bundled data.
 *    - Validate the fallback data with the schema.
 * 3. Read cached game modes from storage; fetch and persist them when absent.
 * 4. Merge each navigation item with its corresponding game mode name/description.
 * 5. Return the enriched navigation array sorted by the original order.
 *
 * @returns {Promise<Array<import("./types.js").NavigationItem & {name?: string, description?: string}>>}
 */
export async function loadNavigationItems() {
  const schema = await getNavigationSchema();
  let navItems;
  try {
    const cached = await navigationCache.load();
    if (Array.isArray(cached)) {
      navItems = cloneNavigationItems(cached);
    } else {
      navItems = null;
    }
  } catch (error) {
    console.error("Failed to load navigationItems from cache:", error);
    navItems = cloneNavigationItems(navigationFallback);
    await validateWithSchema(navItems, schema);
  }
  if (!navItems) {
    navItems = cloneNavigationItems(navigationFallback);
    await validateWithSchema(navItems, schema);
  }

  let gameModes = getItem(GAMEMODES_KEY);
  if (!Array.isArray(gameModes)) {
    gameModes = await fetchJson(`${DATA_DIR}gameModes.json`);
    setItem(GAMEMODES_KEY, gameModes);
  }

  return navItems.map((item) => {
    const mode = gameModes.find((gm) => gm.id === item.gameModeId);
    return {
      ...item,
      name: mode?.name,
      description: mode?.description
    };
  });
}

/**
 * Update the hidden state for a navigation item linked to a game mode.
 *
 * @pseudocode
 * 1. Load navigation items via `navigationCache.load()`; fall back to bundled data when missing.
 * 2. Clone the array and update the matching entry's `isHidden` flag.
 * 3. Validate the updated collection against the navigation schema.
 * 4. Persist the updated entries via `navigationCache.save()` and return them.
 *
 * @param {number} gameModeId - Identifier of the game mode to update.
 * @param {boolean} hidden - Whether the associated navigation entry should be hidden.
 * @returns {Promise<Array<import("./types.js").NavigationItem>>} Updated navigation items.
 */
export async function updateNavigationItemHidden(gameModeId, hidden) {
  const schema = await getNavigationSchema();
  let navItems;
  try {
    navItems = await navigationCache.load();
  } catch (error) {
    console.error("Failed to load navigationItems from cache:", error);
    navItems = null;
  }
  if (!Array.isArray(navItems)) {
    navItems = cloneNavigationItems(navigationFallback);
  } else {
    navItems = cloneNavigationItems(navItems);
  }

  const updated = navItems.map((item) =>
    item.gameModeId === gameModeId ? { ...item, isHidden: hidden } : item
  );

  await validateWithSchema(updated, schema);
  await navigationCache.save(updated);
  return updated;
}
