/**
 * Provides data operations for Aesop's Fables quotes.
 *
 * @module quoteService
 */
import { DATA_DIR } from "../constants.js";
import { seededRandom } from "../testModeUtils.js";

/**
 * Fetches Aesop's Fables story and metadata from JSON files and merges them.
 *
 * @pseudocode
 * 1. Send GET requests to retrieve both `aesopsFables.json` and `aesopsMeta.json` using the `fetch` API.
 *    - Await both responses concurrently.
 * 2. Verify the response status for each request:
 *    - Check that `response.ok` is `true` for both files.
 *    - If either response fails, throw an error with a descriptive message.
 * 3. Parse the JSON responses:
 *    - Convert both response bodies into JavaScript objects using `response.json()`.
 * 4. Merge the metadata with the corresponding story using the shared `id`.
 * 5. Return the combined array of fables.
 *
 * @returns {Promise<Object[]>} A promise that resolves to an array of fables.
 * @throws {Error} If the fetch request fails or the response is not successful.
 */
export async function fetchFables() {
  const [storyRes, metaRes] = await Promise.all([
    fetch(`${DATA_DIR}aesopsFables.json`),
    fetch(`${DATA_DIR}aesopsMeta.json`)
  ]);

  if (!storyRes.ok || !metaRes.ok) {
    throw new Error("Failed to fetch Aesop's fables data");
  }

  const [stories, metadata] = await Promise.all([storyRes.json(), metaRes.json()]);
  const metaMap = new Map(metadata.map((m) => [m.id, m]));
  return stories.map((story) => ({ ...story, ...(metaMap.get(story.id) || {}) }));
}

/**
 * Retrieves a random fable using a seeded RNG.
 *
 * @pseudocode
 * 1. Fetch the fables array using `fetchFables`.
 * 2. Determine the highest `id` among fables.
 * 3. Generate a seeded random id between 1 and `maxId`.
 * 4. Return the matching fable or `null` if not found.
 * 5. If an error occurs, log the error and return `null`.
 *
 * @returns {Promise<Object|null>} A promise that resolves to a fable or `null`.
 */
export async function displayRandomQuote() {
  try {
    const fables = await fetchFables();
    const maxId = Math.max(...fables.map((fable) => fable.id));
    const randomId = Math.floor(seededRandom() * maxId) + 1;
    return fables.find((fable) => fable.id === randomId) || null;
  } catch (error) {
    console.error("Error fetching the fable:", error);
    return null;
  }
}
