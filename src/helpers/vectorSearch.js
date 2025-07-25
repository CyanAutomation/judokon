import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

let embeddingsPromise;
let cachedEmbeddings;

/**
 * Load vector embeddings from `client_embeddings.json`.
 *
 * @pseudocode
 * 1. Return cached embeddings when available.
 * 2. Otherwise fetch `client_embeddings.json` via `fetchJson` and cache the promise.
 *    - On failure, log the error and resolve to `null`.
 * 3. Await the promise, store the result, and return it.
 *
 * @returns {Promise<Array<{id:string,text:string,embedding:number[],source:string,tags?:string[]}>>} Parsed embeddings array.
 */
export async function loadEmbeddings() {
  if (cachedEmbeddings !== undefined) return cachedEmbeddings;
  if (!embeddingsPromise) {
    embeddingsPromise = fetchJson(`${DATA_DIR}client_embeddings.json`).catch((err) => {
      console.error("Failed to load embeddings:", err);
      return null;
    });
  }
  cachedEmbeddings = await embeddingsPromise;
  return cachedEmbeddings;
}

/**
 * Calculate the cosine similarity between two numeric vectors.
 *
 * @pseudocode
 * 1. Validate that `a` and `b` are arrays of equal length.
 *    - Return 0 when validation fails.
 * 2. Iterate through the vectors to accumulate dot product and squared magnitudes.
 * 3. Compute the denominator using the magnitude sums.
 * 4. Return 0 if the denominator is zero; otherwise return the ratio.
 *
 * @param {number[]} a - First vector.
 * @param {number[]} b - Second vector.
 * @returns {number} Cosine similarity between `a` and `b`.
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Find the top matching embeddings for a query vector.
 *
 * @pseudocode
 * 1. Load embeddings using `loadEmbeddings()`.
 * 2. Validate that `queryVector` length matches the embedding dimension.
 *    - If mismatched or embeddings are empty, return an empty array.
 *    - Return `null` when embeddings fail to load.
 * 3. Compute cosine similarity between `queryVector` and each entry's embedding.
 * 4. Sort the entries by similarity score and return the top `topN` results.
 *
 * @param {number[]} queryVector - Vector to compare.
 * @param {number} [topN=5] - Number of matches to return.
 * @returns {Promise<Array<{score:number} & Record<string, any>>>} Match results sorted by score.
 */
export async function findMatches(queryVector, topN = 5) {
  const entries = await loadEmbeddings();
  if (entries === null) {
    return null;
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }
  if (!Array.isArray(queryVector) || queryVector.length !== entries[0].embedding.length) {
    console.warn("Query vector length mismatch.");
    return [];
  }

  return entries
    .map((entry) => ({ score: cosineSimilarity(queryVector, entry.embedding), ...entry }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
