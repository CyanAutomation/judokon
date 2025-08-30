import { loadEmbeddings } from "./loader.js";

/** Bonus applied when the query text contains exact terms from the entry. */
const EXACT_MATCH_BONUS = 0.1;

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

function normalizeStep(state) {
  const status = resolveFirstValid(state.entries);
  if (status.kind !== "ok") return { ...state, status: status.kind };
  if (!validateQueryVector(state.queryVector, status.firstValid.embedding.length)) {
    return { ...state, status: "invalid_query" };
  }
  return {
    ...state,
    entries: collectValidEntries(state.entries, status.firstValid.embedding.length)
  };
}

function tagFilterStep(state) {
  if (!Array.isArray(state.tags) || state.tags.length === 0) return state;
  return {
    ...state,
    entries: state.entries.filter(
      (e) => Array.isArray(e.tags) && state.tags.every((t) => e.tags.includes(t))
    )
  };
}

function sparseFilterStep(state) {
  // When a sparse query is provided, prefer entries that positively match it.
  // Behavior:
  // - For entries with a sparse vector: keep only those with positive dot product.
  // - For entries without a sparse vector: perform a light fallback by checking if any
  //   sparse query term appears in the entry's text (case-insensitive). This preserves
  //   relevance without requiring sparse features in every entry.
  const terms = Object.keys(state.sparseQueryVector ?? {});
  if (terms.length === 0) return state;

  // Lowercased sparse terms (not used directly but normalized earlier if needed).
  // Keep normalization logic inline when needed to avoid unused variable warnings.

  const zeroIdx = Array.isArray(state.queryVector)
    ? state.queryVector.reduce((acc, v, i) => (v === 0 ? (acc.push(i), acc) : acc), [])
    : [];

  const filtered = state.entries
    .map((entry) => {
      const emb = entry?.embedding;
      const hasComplement = Array.isArray(emb) ? zeroIdx.some((i) => emb[i] && emb[i] !== 0) : true; // If embedding is malformed, don't decide here; let normalize handle it.
      if (!hasComplement) return { entry, keep: false };

      if (entry && entry.sparseVector && typeof entry.sparseVector === "object") {
        let score = 0;
        for (const term of terms) {
          const qv = state.sparseQueryVector[term];
          const ev = entry.sparseVector[term];
          if (qv && ev) score += qv * ev;
        }
        return { entry, keep: score > 0 };
      }
      // Without a sparse vector: keep if it complements the query support.
      return { entry, keep: true };
    })
    .filter((r) => r.keep)
    .map((r) => r.entry);

  return { ...state, entries: filtered };
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Compute cosine similarity between two numeric vectors.
 *
 * @summary Calculate cosine similarity in a numerically stable way.
 * @pseudocode
 * 1. If inputs are not arrays of equal length, return 0.
 * 2. Compute dot product and squared magnitudes for both vectors.
 * 3. Return dot / (|a| * |b|) or 0 when magnitude is zero.
 *
 * @param {number[]} a - First vector.
 * @param {number[]} b - Second vector.
 * @returns {number} Cosine similarity in range [-1, 1], or 0 for invalid input.
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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Score a list of entries against a query vector and optional query text.
 *
 * @summary Assign a normalized similarity score [0..1] and apply an exact-term bonus.
 * @pseudocode
 * 1. Tokenize `queryText` into lowercase terms.
 * 2. For each entry:
 *    a. Compute cosine similarity with `queryVector`.
 *    b. Normalize similarity from [-1,1] to [0,1].
 *    c. If any query term appears in the entry text, add a small bonus.
 *    d. Clamp the final score to at most 1.
 * 3. Sort entries in descending score order and return.
 *
 * @param {Array<Record<string, any>>} entries - Candidate entries with `embedding` and `text`.
 * @param {number[]} queryVector - Query embedding vector.
 * @param {string} [queryText=""] - Original query used to provide exact-match boosts.
 * @returns {Array<Record<string, any>>} Sorted entries with an added numeric `score` field.
 */
export function scoreEntries(entries, queryVector, queryText) {
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

function scoringStep(state) {
  return {
    ...state,
    entries: scoreEntries(state.entries, state.queryVector, state.queryText)
  };
}

function limitStep(state) {
  return { ...state, entries: state.entries.slice(0, state.topN) };
}

function runPipeline(state, steps) {
  for (const step of steps) {
    state = step(state);
    if (state.status && state.status !== "ok") break;
  }
  return state;
}

/**
 * Find the top matching embeddings for a query vector.
 *
 * @pseudocode
 * 1. Load embeddings via `loadEmbeddings`.
 * 2. Build a pipeline of operations: normalize, filter by tags, score, limit.
 * 3. Execute steps sequentially, aborting early when a step sets an error status.
 * 4. Return `null` for missing embeddings, `[]` for any non-ok status, or the final list.
 *
 * @param {number[]} queryVector - Vector to compare.
 * @param {number} [topN=5] - Number of matches to return.
 * @param {string[]} [tags=[]] - Tags that must be present on matching entries.
 * @param {string} [queryText=""] - Full query text for exact term matching.
 * @returns {Promise<Array<{score:number} & Record<string, any>>|null>} Match results sorted by score.
 */
export async function findMatches(
  queryVector,
  topN = 5,
  tags = [],
  queryText = "",
  sparseQueryVector = {}
) {
  const entries = await loadEmbeddings();
  if (entries === null) return null;
  const initial = {
    status: "ok",
    entries,
    queryVector,
    topN,
    tags,
    queryText,
    sparseQueryVector
  };
  const pipeline = [
    // 1) Apply sparse filter first to reduce the set early when a sparse query is present.
    sparseFilterStep,
    // 2) Validate embeddings and query vector shape.
    normalizeStep,
    // 3) Apply tag filtering.
    tagFilterStep,
    // 4) Score remaining entries.
    scoringStep,
    // 5) Limit to topN.
    limitStep
  ];
  const result = runPipeline(initial, pipeline);
  if (result.status === "null") return null;
  if (result.status !== "ok") return [];
  return result.entries;
}
