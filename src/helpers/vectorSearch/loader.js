import { fetchJson } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";

let embeddingsPromise;
let cachedEmbeddings;

/**
 * Current version of the client embedding data.
 *
 * Increment this when regenerating embeddings so the UI and loader can
 * detect mismatches between entry metadata and the expected format.
 *
 * @constant {number}
 * @pseudocode
 * 1. Bump this value when embeddings are regenerated.
 * 2. Consumers compare entry.version and metadata.version to this constant.
 *
 * @returns {number} The current embedding schema version.
 */
export const CURRENT_EMBEDDING_VERSION = 1;

/**
 * Load vector embeddings from `client_embeddings.json`.
 *
 * @pseudocode
 * 1. Return cached embeddings when available.
 * 2. Otherwise load via manifest + shards (`client_embeddings.manifest.json`).
 *    - On any failure (manifest or shard), log the error and resolve to `null`.
 * 3. Await the promise, store the result, and return it.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[],qaContext?:string}>>} Parsed embeddings array.
 */
export async function loadEmbeddings() {
  if (cachedEmbeddings !== undefined) return cachedEmbeddings;
  if (!embeddingsPromise) {
    embeddingsPromise = (async () => {
      try {
        // In browser contexts, allow a lightweight single-file override used by tests
        if (typeof window !== "undefined") {
          try {
            const single = await fetchJson(`${DATA_DIR}client_embeddings.json`);
            if (Array.isArray(single)) return single;
          } catch {}
        }
        // Load via manifest + shards
        const manifest = await fetchJson(`${DATA_DIR}client_embeddings.manifest.json`);
        const shardPromises = (manifest?.shards ?? []).map((shardFile) =>
          fetchJson(`${DATA_DIR}${shardFile}`)
        );
        const shards = await Promise.all(shardPromises);
        return shards.flat();
      } catch (err) {
        // Final fallback in browser: legacy single-file
        if (typeof window !== "undefined") {
          try {
            return await fetchJson(`${DATA_DIR}client_embeddings.json`);
          } catch (legacyError) {
            console.error("Failed to load embeddings:", err, legacyError);
            return null;
          }
        }
        console.error("Failed to load embeddings:", err);
        return null;
      }
    })();
  }
  cachedEmbeddings = await embeddingsPromise;
  return cachedEmbeddings;
}
