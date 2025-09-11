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
  const {
    k = 5,
    filters = [],
    strategy = null,
    withProvenance = false,
    withDiagnostics = false,
    allowLexicalFallback = false
  } = opts;
  const t0 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const expanded = await vectorSearch.expandQueryWithSynonyms(question);
  let vector;
  try {
    const extractor = await getExtractor();
    const embedding = await extractor(expanded, { pooling: "mean" });
    const source =
      embedding && typeof embedding === "object" && "data" in embedding ? embedding.data : embedding;
    if (!isIterable(source)) return [];
    vector = Array.from(source);
  } catch (err) {
    const fallbackEnabled = allowLexicalFallback || process?.env?.RAG_ALLOW_LEXICAL_FALLBACK === "1";
    if (!fallbackEnabled) throw err;
    const results = await lexicalFallbackSearch(question, k, filtersForStrategy(filters, strategy));
    const enriched = withProvenance
      ? results.map((m) => ({ ...m, contextPath: normalizeContextPath(m), rationale: buildRationale(question, m) }))
      : results;
    if (!withDiagnostics) return enriched;
    const t1 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    return Object.assign([], enriched, {
      diagnostics: {
        expandedQuery: expanded,
        multiIntentApplied: false,
        timingMs: +(t1 - t0).toFixed(2),
        lexicalFallback: true
      }
    });
  }
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
        return vectorSearch.findMatches(vec, k, filtersForStrategy(filters, strategy), q);
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
    matches = await vectorSearch.findMatches(
      vector,
      k,
      filtersForStrategy(filters, strategy),
      question
    );
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
    matches = await vectorSearch.findMatches(
      vector,
      k,
      filtersForStrategy(filters, strategy),
      question
    );
  }
  if (!Array.isArray(matches)) return matches;

  const enriched = withProvenance
    ? matches.map((m) => ({
        ...m,
        contextPath: normalizeContextPath(m),
        rationale: buildRationale(question, m)
      }))
    : matches;

  if (!withDiagnostics) return enriched;
  const t1 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  return Object.assign([], enriched, {
    diagnostics: {
      expandedQuery: expanded,
      multiIntentApplied: subQueries.length > 1,
      timingMs: +(t1 - t0).toFixed(2)
    }
  });
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOP.has(t));
}

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "in",
  "on",
  "at",
  "for",
  "to",
  "of",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "this",
  "that",
  "these",
  "those"
]);

function toSparse(text) {
  const tf = Object.create(null);
  for (const tok of tokenize(text)) tf[tok] = (tf[tok] || 0) + 1;
  return tf;
}

function cosineSparse(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (const [t, v] of Object.entries(a)) {
    na += v * v;
    if (b[t]) dot += v * b[t];
  }
  for (const v of Object.values(b)) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

async function lexicalFallbackSearch(question, k, filters) {
  const entries = await vectorSearch.loadEmbeddings();
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const q = toSparse(question);
  const filt = new Set(filters || []);
  const scored = [];
  for (const item of entries) {
    const sv = item.sparseVector || toSparse(item.text || "");
    const base = cosineSparse(q, sv);
    const tagBonus = Array.isArray(item.tags) && item.tags.some((t) => filt.has(t)) ? 0.05 : 0;
    const exactBonus = typeof item.text === "string" && item.text.toLowerCase().includes(String(question).toLowerCase()) ? 0.05 : 0;
    const score = base + tagBonus + exactBonus;
    if (score > 0) {
      scored.push({ ...item, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
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

function normalizeContextPath(match) {
  if (match.contextPath) return match.contextPath;
  const src = String(match.source || "");
  // Example sources: "design/productRequirementsDocuments/prdNavigationBar.md [chunk 21]"
  // Pull base filename and optional bracket info.
  let file = src;
  let bracket = "";
  const bIdx = src.indexOf("[");
  if (bIdx !== -1) {
    file = src.slice(0, bIdx).trim();
    bracket = src.slice(bIdx).replace(/^[\[\s]*|[\]\s]*$/g, "");
  }
  const parts = file.split("/");
  const name = parts[parts.length - 1] || file;
  const domain = parts[0] || "src";
  const base = name
    .replace(/\.(md|js|json)$/i, "")
    .replace(/^prd/i, "")
    .replace(/[-_]/g, " ");
  const tags = Array.isArray(match.tags) ? match.tags.join(" > ") : "";
  const pieces = [domain, base.trim()].filter(Boolean);
  if (tags) pieces.push(tags);
  if (bracket) pieces.push(bracket);
  return pieces.join(" > ").toLowerCase();
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

function filtersForStrategy(filters, strategy) {
  if (strategy === "implementation-lookup") {
    const biasTags = ["data", "code", "css"];
    const set = new Set([...(filters || []), ...biasTags]);
    return Array.from(set);
  }
  return filters || [];
}

export default queryRag;
