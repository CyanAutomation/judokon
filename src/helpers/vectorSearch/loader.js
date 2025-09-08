import { fetchJson } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";
import { isNodeEnvironment } from "../env.js";

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
 * Load embeddings from the compact offline dataset.
 *
 * @pseudocode
 * 1. Skip when not running under Node or when `RAG_FORCE_JSON` is set.
 * 2. Read metadata and vector files from the data directory.
 * 3. Construct embedding objects by combining metadata with vectors.
 * 4. Return the array on success or `null` on failure.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[],qaContext?:string}>|null>} Parsed embeddings or `null`.
 */
export async function loadOfflineEmbeddings() {
  if (!isNodeEnvironment() || process?.env?.RAG_FORCE_JSON) return null;
  try {
    const metaUrl = new URL(`${DATA_DIR}offline_rag_metadata.json`);
    const vecUrl = new URL(`${DATA_DIR}offline_rag_vectors.bin`);
    const { fileURLToPath } = await import("node:url");
    const { readFile } = await import("node:fs/promises");
    const metaPath = fileURLToPath(metaUrl);
    const vecPath = fileURLToPath(vecUrl);

    const metaRaw = await readFile(metaPath, "utf8");
    const { vectorLength, items } = JSON.parse(metaRaw);
    if (!vectorLength || !Array.isArray(items)) throw new Error("Invalid offline metadata");

    const buffer = await readFile(vecPath);
    const out = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const offset = i * vectorLength;
      const view = new Int8Array(buffer.buffer, buffer.byteOffset + offset, vectorLength);
      out[i] = { ...items[i], embedding: Array.from(view) };
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Load embeddings from a single JSON file.
 *
 * @pseudocode
 * 1. Skip when `window` is undefined.
 * 2. Fetch `client_embeddings.json`.
 * 3. Return the array when valid; otherwise `null`.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[],qaContext?:string}>|null>} Parsed embeddings or `null`.
 */
export async function loadSingleFileEmbeddings() {
  if (typeof window === "undefined") return null;
  try {
    const single = await fetchJson(`${DATA_DIR}client_embeddings.json`);
    return Array.isArray(single) ? single : null;
  } catch {
    return null;
  }
}

/**
 * Load embeddings using a manifest and shard files.
 *
 * @pseudocode
 * 1. Fetch `client_embeddings.manifest.json`.
 * 2. Fetch each shard listed in the manifest.
 * 3. Flatten shards into a single array.
 * 4. Return the array or `null` on failure.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[],qaContext?:string}>|null>} Parsed embeddings or `null`.
 */
export async function loadManifestEmbeddings() {
  try {
    const manifest = await fetchJson(`${DATA_DIR}client_embeddings.manifest.json`);
    const shardPromises = (manifest?.shards ?? []).map((shardFile) =>
      fetchJson(`${DATA_DIR}${shardFile}`)
    );
    const shards = await Promise.all(shardPromises);
    return shards.flat();
  } catch {
    return null;
  }
}

/**
 * Load vector embeddings from available sources.
 *
 * @pseudocode
 * 1. Return cached embeddings when already loaded.
 * 2. Sequentially attempt offline, single-file, and manifest loaders.
 * 3. Cache and return the first successful result or `null` on total failure.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[],qaContext?:string}>|null>} Parsed embeddings array.
 */
export async function loadEmbeddings() {
  if (cachedEmbeddings !== undefined) return cachedEmbeddings;
  if (!embeddingsPromise) {
    embeddingsPromise = (async () => {
      let lastError;
      const loaders = [
        loadOfflineEmbeddings,
        loadSingleFileEmbeddings,
        loadManifestEmbeddings,
        loadSingleFileEmbeddings
      ];
      for (const loader of loaders) {
        try {
          const result = await loader();
          if (result) return result;
        } catch (err) {
          lastError = err;
        }
      }
      console.error("Failed to load embeddings:", lastError);
      return null;
    })();
  }
  cachedEmbeddings = await embeddingsPromise;
  return cachedEmbeddings;
}
