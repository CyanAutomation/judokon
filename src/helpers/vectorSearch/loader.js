import { fetchJson } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";

let embeddingsPromise;
let cachedEmbeddings;

/**
 * Current version of the client embedding data.
 *
 * Increment this when regenerating embeddings to ensure the
 * vector search page can detect outdated data.
 */
export const CURRENT_EMBEDDING_VERSION = 1;

/**
 * Load vector embeddings from `client_embeddings.json`.
 *
 * @pseudocode
 * 1. Return cached embeddings when available.
 * 2. Otherwise fetch `client_embeddings.json` via `fetchJson` and cache the promise.
 *    - On failure, log the error and resolve to `null`.
 * 3. Await the promise, store the result, and return it.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[],qaContext?:string}>>} Parsed embeddings array.
 */
export async function loadEmbeddings() {
  if (cachedEmbeddings !== undefined) return cachedEmbeddings;
  if (!embeddingsPromise) {
    embeddingsPromise = (async () => {
      try {
        // Preferred: load via manifest + shards
        const manifest = await fetchJson(`${DATA_DIR}client_embeddings.manifest.json`);
        const shardPromises = (manifest?.shards ?? []).map((shardFile) =>
          fetchJson(`${DATA_DIR}${shardFile}`)
        );
        const shards = await Promise.all(shardPromises);
        return shards.flat();
      } catch (manifestError) {
        // Fallback: legacy single-file embeddings for backward compatibility (e.g., tests)
        try {
          return await fetchJson(`${DATA_DIR}client_embeddings.json`);
        } catch (legacyError) {
          console.error("Failed to load embeddings:", manifestError, legacyError);
          return null;
        }
      }
    })();
  }
  cachedEmbeddings = await embeddingsPromise;
  return cachedEmbeddings;
}
