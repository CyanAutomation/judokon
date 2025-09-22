import { fetchJson, validateWithSchema, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { getItem, setItem, removeItem } from "./storage.js";

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
