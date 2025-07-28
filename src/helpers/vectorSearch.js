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
 * 3. When `tags` are provided, filter the embeddings to those containing all tags.
 * 4. Compute cosine similarity between `queryVector` and each entry's embedding.
 * 5. Sort the entries by similarity score and return the top `topN` results.
 *
 * @param {number[]} queryVector - Vector to compare.
 * @param {number} [topN=5] - Number of matches to return.
 * @returns {Promise<Array<{score:number} & Record<string, any>>>} Match results sorted by score.
 */
export async function findMatches(queryVector, topN = 5, tags = []) {
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
  const filtered =
    Array.isArray(tags) && tags.length > 0
      ? entries.filter((e) => Array.isArray(e.tags) && tags.every((t) => e.tags.includes(t)))
      : entries;

  return filtered
    .map((entry) => ({ score: cosineSimilarity(queryVector, entry.embedding), ...entry }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

const CHUNK_SIZE = 1500;
const OVERLAP = 200;

function chunkMarkdown(text) {
  const segments = text
    .split(/(?:\r?\n){2,}|(?=^#+\s)/gm)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];
  let i = 0;

  while (i < segments.length) {
    if (segments[i].length > CHUNK_SIZE) {
      const seg = segments[i];
      for (let start = 0; start < seg.length; start += CHUNK_SIZE - OVERLAP) {
        chunks.push(seg.slice(start, start + CHUNK_SIZE));
      }
      i += 1;
      continue;
    }

    let chunkText = segments[i];
    let length = chunkText.length;
    let j = i + 1;
    while (j < segments.length && length + 2 + segments[j].length <= CHUNK_SIZE) {
      chunkText += `\n\n${segments[j]}`;
      length += 2 + segments[j].length;
      j += 1;
    }
    chunks.push(chunkText);

    let overlapLen = 0;
    let k = j - 1;
    while (k >= i && overlapLen < OVERLAP) {
      overlapLen += segments[k].length + 2;
      k -= 1;
    }
    let nextIndex = Math.max(k + 1, j - 1);
    if (nextIndex <= i) {
      nextIndex = j;
    }
    i = nextIndex;
  }

  return chunks;
}

/**
 * Fetch neighboring context chunks for a given embedding id.
 *
 * @pseudocode
 * 1. Validate that `id` matches the `filename-chunk-N` pattern.
 *    - Return an empty array for invalid ids.
 * 2. Build a URL to the markdown file using the filename.
 * 3. Fetch the markdown text with `fetch` and split it using `chunkMarkdown`.
 * 4. Determine the slice of chunks around the requested index based on `radius`.
 * 5. Return the selected chunk texts.
 *
 * @param {string} id - Entry identifier like `foo.md-chunk-3`.
 * @param {number} [radius=1] - Number of neighboring chunks to include.
 * @returns {Promise<string[]>} Array of surrounding chunk strings.
 */
export async function fetchContextById(id, radius = 1) {
  const match = /^([^\s]+\.md)-chunk-(\d+)$/.exec(id);
  if (!match) return [];
  const [, filename, num] = match;
  const index = Number(num) - 1;
  try {
    const url = new URL(`../../design/productRequirementsDocuments/${filename}`, import.meta.url)
      .href;
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const chunks = chunkMarkdown(text);
    const start = Math.max(0, index - radius);
    const end = Math.min(chunks.length, index + radius + 1);
    return chunks.slice(start, end);
  } catch {
    return [];
  }
}
