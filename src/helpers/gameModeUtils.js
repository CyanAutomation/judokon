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
 * 3. If no stored data exists, attempt to fetch `gameModes.json` from `DATA_DIR`.
 *    - On failure, dynamically import the JSON file instead.
 *    - Persist the resolved array to `localStorage`.
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
  let data;
  try {
    data = await fetchJson(`${DATA_DIR}gameModes.json`, await getSchema());
  } catch (error) {
    console.warn("Failed to fetch game modes, falling back to import", error);
    data = (await import("../data/gameModes.json", { assert: { type: "json" } })).default;
    await validateWithSchema(data, await getSchema());
  }
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

/**
 * Retrieve a game mode object by its ID.
 *
 * @pseudocode
 * 1. Load all game modes using `loadGameModes()`.
 * 2. Find and return the mode with the matching `id`.
 *    - If not found, return `undefined`.
 *
 * @param {string} id - The ID of the game mode to retrieve.
 * @returns {Promise<Object|undefined>} The game mode object or undefined if not found.
 */
export async function getGameModeById(id) {
  const modes = await loadGameModes();
  return modes.find((m) => m.id === id);
}

/**
 * Validate a destination URL for a game mode. Logs an error and optionally redirects if invalid.
 *
 * @pseudocode
 * 1. Check if the provided URL is a non-empty string and matches a known game mode URL.
 * 2. If valid, return true.
 * 3. If invalid, log an error and optionally redirect to a default error page.
 *
 * @param {string} url - The destination URL to validate.
 * @param {boolean} [redirect=false] - Whether to redirect to error page if invalid.
 * @returns {Promise<boolean>} True if valid, false otherwise.
 */
export async function validateGameModeUrl(url, redirect = false) {
  if (typeof url !== "string" || !url) {
    console.error("Invalid or empty game mode URL");
    if (redirect) window.location.href = "/src/pages/error.html";
    return false;
  }
  const modes = await loadGameModes();
  const valid = modes.some((m) => m.url === url);
  if (!valid) {
    console.error(`Broken destination URL: ${url}`);
    if (redirect) window.location.href = "/src/pages/error.html";
    return false;
  }
  return true;
}
