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
  const matches = await vectorSearch.findMatches(vector, k, filters, question);
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
    const tagNote = Array.isArray(match.tags) && match.tags.length ? `; tags: ${match.tags.slice(0,3).join(',')}` : '';
    const section = match.contextPath ? ` in ${match.contextPath}` : '';
    return `cosine+exact bonus; terms hit: ${hits.slice(0,3).join('/')} ; score=${match.score.toFixed?.(3) ?? match.score}${section}${tagNote}`;
  } catch {
    return "cosine+exact bonus";
  }
}

export default queryRag;
