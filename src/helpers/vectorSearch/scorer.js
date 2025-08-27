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
  if (Object.keys(state.sparseQueryVector).length === 0) return state;
  const scoredEntries = state.entries.map((entry) => {
    let score = 0;
    if (entry.sparseVector) {
      for (const term in state.sparseQueryVector) {
        if (entry.sparseVector[term]) {
          score += state.sparseQueryVector[term] * entry.sparseVector[term];
        }
      }
    }
    return { ...entry, sparseScore: score };
  });
  return {
    ...state,
    entries: scoredEntries.filter((e) => e.sparseScore > 0)
  };
}

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
  const pipeline = [sparseFilterStep, normalizeStep, tagFilterStep, scoringStep, limitStep];
  const result = runPipeline(initial, pipeline);
  if (result.status === "null") return null;
  if (result.status !== "ok") return [];
  return result.entries;
}
