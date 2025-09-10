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
 * Attempt to load compact offline embeddings in Node.
 *
 * @pseudocode
 * 1. Exit early when not in Node or when `RAG_FORCE_JSON` is set.
 * 2. Read metadata and vector binary files.
 * 3. For each item, slice the buffer with `Int8Array` and attach the embedding array.
 * 4. Return the assembled embeddings array; on error, return `null`.
 *
 * @returns {Promise<Array|Null>} Embeddings array on success, otherwise `null`.
 */
export async function loadOfflineEmbeddings() {
  if (!isNodeEnvironment() || process?.env?.RAG_FORCE_JSON) return null;
  try {
    const metaUrl = new URL(`${DATA_DIR}offline_rag_metadata.json`);
    const vecUrl = new URL(`${DATA_DIR}offline_rag_vectors.bin`);
    const { fileURLToPath } = await import("node:url");
    const { readFile } = await import("node:fs/promises");
    const metaRaw = await readFile(fileURLToPath(metaUrl), "utf8");
    const { vectorLength, items } = JSON.parse(metaRaw);
    if (!vectorLength || !Array.isArray(items)) return null;
    const buffer = await readFile(fileURLToPath(vecUrl));
    const out = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const offset = i * vectorLength * Int8Array.BYTES_PER_ELEMENT;
      const view = new Int8Array(buffer.buffer, buffer.byteOffset + offset, vectorLength);
      out[i] = { ...items[i], embedding: Array.from(view) };
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Load single-file embeddings used in browser tests.
 *
 * @pseudocode
 * 1. Skip when `window` is undefined.
 * 2. Fetch `client_embeddings.json` via `fetchJson`.
 * 3. Return the array when valid; otherwise return `null`.
 *
 * @returns {Promise<Array|Null>} Parsed embeddings or `null`.
 */
export async function loadSingleFileEmbeddings() {
  // Allow Node to read the single-file JSON via file URL as well as browser fetch.
  try {
    const url = `${DATA_DIR}client_embeddings.json`;
    if (typeof window === "undefined") {
      const { fileURLToPath } = await import("node:url");
      const { readFile } = await import("node:fs/promises");
      const raw = await readFile(fileURLToPath(new URL(url)), "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    }
    const single = await fetchJson(url);
    return Array.isArray(single) ? single : null;
  } catch {
    return null;
  }
}

/**
 * Load embeddings via manifest + shards.
 *
 * @pseudocode
 * 1. Fetch the manifest and derive shard URLs.
 * 2. Fetch all shard files in parallel.
 * 3. Flatten the shard arrays and return them.
 * 4. On any error, return `null`.
 *
 * @returns {Promise<Array|Null>} Combined shard embeddings or `null`.
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
 * Load vector embeddings from multiple sources.
 *
 * @pseudocode
 * 1. Return cached embeddings when available.
 * 2. Sequentially try `loadOfflineEmbeddings`, `loadSingleFileEmbeddings`, and `loadManifestEmbeddings`.
 * 3. Cache and return the first successful result.
 * 4. When all loaders fail, log an error and return `null`.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[],qaContext?:string}>|null>} Parsed embeddings array or `null`.
 */
export async function loadEmbeddings() {
  if (cachedEmbeddings !== undefined) return cachedEmbeddings;
  if (!embeddingsPromise) {
    embeddingsPromise = (async () => {
      const loaders = [loadOfflineEmbeddings, loadSingleFileEmbeddings, loadManifestEmbeddings];
      const errors = [];
      for (const fn of loaders) {
        try {
          const result = await fn();
          if (result) return result;
        } catch (err) {
          errors.push(err);
        }
      }
      if (errors.length) console.error("Failed to load embeddings:", ...errors);
      return null;
    })();
  }
  cachedEmbeddings = await embeddingsPromise;
  return cachedEmbeddings;
}
