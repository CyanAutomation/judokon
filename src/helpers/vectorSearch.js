import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

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
 * 2. Determine expected dimension from the first valid embedding and ensure
 *    `queryVector` matches it.
 *    - Return `null` when embeddings fail to load.
 *    - Return an empty array for mismatches or when no embeddings are present.
 * 3. Filter out entries with missing, non-numeric, or mis-sized embeddings.
 *    - Log a warning for each skipped entry.
 * 4. When `tags` are provided, filter the remaining entries to those containing
 *    all tags.
 * 5. Compute cosine similarity between `queryVector` and each entry's
 *    embedding.
 * 6. Normalize scores to the 0–1 range and apply a small bonus when the query
 *    text appears verbatim in the entry.
 * 7. Sort the entries by similarity score and return the top `topN` results.
 *
 * @param {number[]} queryVector - Vector to compare.
 * @param {number} [topN=5] - Number of matches to return.
 * @param {string[]} [tags=[]] - Tags that must be present on matching entries.
 * @param {string} [queryText=""] - Full query text for exact term matching.
 * @returns {Promise<Array<{score:number} & Record<string, any>>>} Match results sorted by score.
 */
/** Bonus applied when the query text contains exact terms from the entry. */
const EXACT_MATCH_BONUS = 0.1;

/**
 * Validate and normalize the raw embeddings array.
 *
 * @param {any} entries
 * @param {number[]} queryVector
 * @returns {{status: "null"}|{status: "empty"}|{status: "invalid_query"}|{status: "ok", list: any[]}}
 */
function resolveFirstValid(entries) {
  if (entries === null) return { kind: "null" };
  if (!Array.isArray(entries) || entries.length === 0) return { kind: "empty" };
  const firstValid = entries.find(
    (e) => Array.isArray(e.embedding) && e.embedding.every((v) => typeof v === "number")
  );
  if (!firstValid) return { kind: "empty" };
  return { kind: "ok", firstValid };
}

function validateQueryVector(vec, expectedLen) {
  if (!Array.isArray(vec) || vec.length !== expectedLen) {
    console.warn("Query vector length mismatch.");
    return false;
  }
  return true;
}

function collectValidEntries(entries, expectedLen) {
  const out = [];
  for (const entry of entries) {
    const emb = entry.embedding;
    if (
      !Array.isArray(emb) ||
      emb.length !== expectedLen ||
      emb.some((v) => typeof v !== "number")
    ) {
      console.warn(`Skipping entry ${entry.id ?? "(unknown id)"} due to invalid embedding.`);
      continue;
    }
    out.push(entry);
  }
  return out;
}

function normalizeEmbeddings(entries, queryVector) {
  const status = resolveFirstValid(entries);
  if (status.kind !== "ok") return { status: status.kind };
  if (!validateQueryVector(queryVector, status.firstValid.embedding.length)) {
    return { status: "invalid_query" };
  }
  const validEntries = collectValidEntries(entries, status.firstValid.embedding.length);
  return { status: "ok", list: validEntries };
}

function filterByTags(entries, tags) {
  if (!Array.isArray(tags) || tags.length === 0) return entries;
  return entries.filter((e) => Array.isArray(e.tags) && tags.every((t) => e.tags.includes(t)));
}

function scoreEntries(entries, queryVector, queryText) {
  const terms = String(queryText).toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .map((entry) => {
      const sim = cosineSimilarity(queryVector, entry.embedding);
      const normalized = (sim + 1) / 2;
      const text = entry.text?.toLowerCase() ?? "";
      const hasTerm = terms.some((t) => text.includes(t));
      const bonus = hasTerm ? EXACT_MATCH_BONUS : 0;
      return { score: Math.min(1, normalized + bonus), ...entry };
    })
    .sort((a, b) => b.score - a.score);
}

export async function findMatches(queryVector, topN = 5, tags = [], queryText = "") {
  const entries = await loadEmbeddings();
  const normalized = normalizeEmbeddings(entries, queryVector);
  if (normalized.status === "null") return null;
  if (normalized.status !== "ok") return [];
  const filtered = filterByTags(normalized.list, tags);
  return scoreEntries(filtered, queryVector, queryText).slice(0, topN);
}

const CHUNK_SIZE = 1500;
const OVERLAP = 100;

function splitIntoSections(lines) {
  const heading = /^(#{1,6})\s+/;
  const sections = [];
  let i = 0;
  while (i < lines.length && !heading.test(lines[i])) i++;
  if (i > 0) {
    const pre = lines.slice(0, i).join("\n").trim();
    if (pre) sections.push(pre);
  }
  collectHeadingSections(lines, i, sections);
  return sections;
}

function collectHeadingSections(lines, startIdx, out) {
  const heading = /^(#{1,6})\s+/;
  for (let idx = startIdx; idx < lines.length; idx++) {
    const match = heading.exec(lines[idx]);
    if (!match) continue;
    const level = match[1].length;
    let j = idx + 1;
    while (j < lines.length) {
      const next = heading.exec(lines[j]);
      if (next && next[1].length <= level) break;
      j++;
    }
    const section = lines.slice(idx, j).join("\n").trim();
    if (section) out.push(section);
  }
}

function chunkSection(section) {
  if (section.length <= CHUNK_SIZE) return [section];
  const chunks = [];
  for (let start = 0; start < section.length; start += CHUNK_SIZE - OVERLAP) {
    chunks.push(section.slice(start, start + CHUNK_SIZE));
  }
  return chunks;
}

function chunkMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const sections = splitIntoSections(lines);
  const chunks = [];
  for (const section of sections) {
    chunks.push(...chunkSection(section));
  }
  return chunks;
}

export { chunkMarkdown };

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
  } catch (err) {
    console.error(`Failed to load context from ${filename}`, err);
    return [];
  }
}
