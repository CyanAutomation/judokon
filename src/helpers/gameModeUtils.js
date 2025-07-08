import { fetchJson, validateWithSchema } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

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
      .catch(
        async () =>
          (await import("../schemas/gameModes.schema.json", { assert: { type: "json" } })).default
      );
  }
  return schemaPromise;
}

const GAMEMODES_KEY = "gameModes";

/**
 * Load game modes from localStorage or fallback to the default JSON file.
 *
 * @pseudocode
 * 1. Call `getSchema()` to lazily load the validation schema.
 * 2. Attempt to read `GAMEMODES_KEY` from `localStorage`.
 *    - Parse and validate the JSON when present.
 * 3. If no stored data exists, fetch `gameModes.json` from `DATA_DIR`.
 *    - Persist the fetched array to `localStorage`.
 * 4. Return the validated array of game mode objects.
 *
 * @returns {Promise<Array>} Resolved array of game mode objects.
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
  const data = await fetchJson(`${DATA_DIR}gameModes.json`, await getSchema());
  localStorage.setItem(GAMEMODES_KEY, JSON.stringify(data));
  return data;
}

/**
 * Persist an array of game modes to localStorage.
 *
 * @pseudocode
 * 1. Call `getSchema()` to lazily load the schema.
 * 2. Validate the provided `modes` with the schema.
 * 3. Serialize the array and store it under `GAMEMODES_KEY`.
 *
 * @param {Array} modes - Array of game mode objects.
 * @returns {Promise<void>} Promise that resolves when saving completes.
 */
export async function saveGameModes(modes) {
  await validateWithSchema(modes, await getSchema());
  if (typeof localStorage === "undefined") {
    throw new Error("localStorage unavailable");
  }
  localStorage.setItem(GAMEMODES_KEY, JSON.stringify(modes));
}

/**
 * Update the `isHidden` value for a specific game mode.
 *
 * @pseudocode
 * 1. Load the current game modes using `loadGameModes()` (lazy loads schema).
 * 2. Find the mode matching `id` and update its `isHidden` property.
 *    - Throw an error if the mode is not found.
 * 3. Validate and persist the updated array with `saveGameModes()`.
 * 4. Return the updated array.
 *
 * @param {string} id - Identifier of the game mode to update.
 * @param {boolean} isHidden - New hidden state for the mode.
 * @returns {Promise<Array>} Updated array of game modes.
 */
export async function updateGameModeHidden(id, isHidden) {
  await getSchema();
  const modes = await loadGameModes();
  const index = modes.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`Game mode not found: ${id}`);
  }
  modes[index] = { ...modes[index], isHidden };
  await saveGameModes(modes);
  return modes;
}
