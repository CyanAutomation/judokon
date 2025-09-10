import vectorSearch from "./vectorSearch/index.js";
import { getExtractor } from "./api/vectorSearchPage.js";

function isIterable(value) {
  return value !== null && value !== undefined && typeof value[Symbol.iterator] === "function";
}

/**
 * Query the vector database for a natural language question.
 *
 * @pseudocode
 * 1. Expand `question` with domain-specific synonyms.
 * 2. Load the MiniLM feature extractor and embed the expanded text.
 * 3. Convert the embedding to a plain array.
 * 4. Use `vectorSearch.findMatches` to retrieve the top results for the original question.
 * 5. Return the matches array.
 *
 * @param {string} question - Natural language question to look up.
 * @returns {Promise<Array<{score:number} & Record<string, any>>|null>} Top matches or null if data missing.
 */
export async function queryRag(question, opts = {}) {
  const { k = 5, filters = [], withProvenance = false } = opts;
  const expanded = await vectorSearch.expandQueryWithSynonyms(question);
  const extractor = await getExtractor();
  const embedding = await extractor(expanded, { pooling: "mean" });
  const source =
    embedding && typeof embedding === "object" && "data" in embedding ? embedding.data : embedding;
  if (!isIterable(source)) return [];
  const vector = Array.from(source);
  // Multi-intent: split simple conjunctions and union-re-rank
  const subQueries = splitMultiIntent(question);
  let matches;
  if (subQueries.length > 1) {
    const parts = await Promise.all(
      subQueries.map(async (q) => {
        const exp = await vectorSearch.expandQueryWithSynonyms(q);
        const emb = await extractor(exp, { pooling: "mean" });
        const src = emb && typeof emb === "object" && "data" in emb ? emb.data : emb;
        const vec = Array.isArray(src) ? Array.from(src) : null;
        if (!vec) return [];
        return vectorSearch.findMatches(vec, k, filters, q);
      })
    );
    const merged = Object.values(
      Object.fromEntries(
        parts
          .flat()
          .filter(Boolean)
          .map((m) => [m.id || `${m.source}|${m.text?.slice(0, 40)}`, m])
      )
    );
    // Re-score merged against the main vector using original question text
    matches = await vectorSearch.findMatches(vector, k, filters, question);
    // Merge scores: prefer existing score if present else keep from merged set
    const byId = new Map(matches.map((m) => [m.id || m.source, m]));
    for (const m of merged) {
      const key = m.id || m.source;
      if (!byId.has(key)) byId.set(key, m);
    }
    matches = Array.from(byId.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  } else {
    matches = await vectorSearch.findMatches(vector, k, filters, question);
  }
  if (!withProvenance || !Array.isArray(matches)) return matches;
  return matches.map((m) => ({
    ...m,
    contextPath: m.contextPath || m.section || m.tags?.join(" > ") || null,
    rationale: buildRationale(question, m)
  }));
}

function buildRationale(query, match) {
  try {
    const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    const text = String(match.text || "").toLowerCase();
    const hits = terms.filter((t) => text.includes(t));
    const tagNote =
      Array.isArray(match.tags) && match.tags.length
        ? `; tags: ${match.tags.slice(0, 3).join(",")}`
        : "";
    const section = match.contextPath ? ` in ${match.contextPath}` : "";
    return `cosine+exact bonus; terms hit: ${hits.slice(0, 3).join("/")} ; score=${match.score.toFixed?.(3) ?? match.score}${section}${tagNote}`;
  } catch {
    return "cosine+exact bonus";
  }
}

function splitMultiIntent(query) {
  const raw = String(query).toLowerCase();
  const parts = raw
    .split(/\b(?:and|\+|&|with|vs)\b/g)
    .map((s) => s.trim())
    .filter(Boolean);
  // Avoid over-splitting short queries
  return parts.length >= 2 && raw.length >= 20 ? parts.slice(0, 3) : [raw];
}

export default queryRag;
