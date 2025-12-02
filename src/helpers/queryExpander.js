/**
 * Query expansion utility for MCP server
 * Provides explicit control over query expansion for improved search relevance
 */

import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

/**
 * Maximum number of individual terms (words) allowed in an expanded query.
 * Queries exceeding this limit will be truncated.
 * @type {number}
 */
export const MAX_QUERY_TERMS = 50;
/**
 * Maximum character length for an expanded query.
 * Queries exceeding this length will be truncated to prevent overly long search strings.
 * @type {number}
 */
export const MAX_QUERY_LENGTH = 512;

/**
 * @typedef {object} ExpandedQueryResult
 * @property {string} original - Original query string provided by the caller.
 * @property {string} expanded - Expanded query that includes synonym terms.
 * @property {string[]} addedTerms - Synonym terms that were appended to the query.
 * @property {number} synonymsUsed - Count of unique synonym terms that were added.
 * @property {boolean} hasExpansion - Indicates whether any synonym terms were appended.
 */

/**
 * @typedef {object} SynonymStats
 * @property {number} totalMappings - Number of individual entries in the synonym map.
 * @property {number} totalSynonyms - Total count of synonym values across all mappings.
 * @property {string|0} averageSynonymsPerMapping - Average synonyms per mapping (fixed decimal string when calculable, 0 when no mappings).
 * @property {{ key: string, synonyms: string[] }[]} mappingExamples - Example synonym entries for debugging.
 */

let synonymsCache;
let synonymsCachePromise;
let synonymCacheHits = 0;

/**
 * Load the synonym mapping JSON
 * @returns {Promise<Record<string, string[]>>} Synonym map or empty object on failure
 */
async function loadSynonyms() {
  if (synonymsCache) {
    synonymCacheHits += 1;
    return synonymsCache;
  }

  if (!synonymsCachePromise) {
    synonymsCachePromise = (async () => {
      try {
        const data = await fetchJson(`${DATA_DIR}synonyms.json`);
        synonymsCache = data;
      } catch (err) {
        console.error("Failed to load synonyms.json:", err.message);
        synonymsCache = {};
      } finally {
        // Clear the in-flight promise after cache is populated
        synonymsCachePromise = undefined;
      }

      return synonymsCache;
    })();
  }

  return synonymsCachePromise;
}

/**
 * Compute Levenshtein distance between two strings
 * Measures the minimum number of edits (insertions, deletions, substitutions)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 * @private
 */
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Find matching synonym mappings for a query
 * Uses exact matches and fuzzy matching (Levenshtein distance <= 2)
 * @param {string} query - Input query string
 * @param {Record<string, string[]>} synonymMap - Synonym mapping
 * @returns {Set<string>} Matched synonym expansions
 * @private
 */
function findSynonymMatches(query, synonymMap) {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const matches = new Set();

  for (const [key, synonyms] of Object.entries(synonymMap)) {
    const variants = Array.isArray(synonyms) ? synonyms : [];
    const allTerms = [key, ...variants];

    // Check if any variant matches the query (exact or fuzzy)
    const isMatched = allTerms.some((term) => {
      const t = term.toLowerCase();
      // Exact substring match
      if (lower.includes(t)) return true;
      // Fuzzy match on whole query
      if (levenshtein(lower, t) <= 2) return true;
      // Fuzzy match on individual words
      return words.some((w) => levenshtein(w, t) <= 2);
    });

    // Add all synonyms if match found
    if (isMatched) {
      variants.forEach((v) => matches.add(v.toLowerCase()));
    }
  }

  return matches;
}

// Unicode-aware character classification patterns
const UNICODE_LETTER_NUMBER_REGEX = /[\p{L}\p{N}]/u;
const UNICODE_WHITESPACE_REGEX = /\s/;

// Strip special characters (preserving hyphens), normalize case, and clamp length/term count
// so expanded terms never include punctuation even when the original query does. Uses
// character-by-character filtering to stay Unicode-aware without regex backtracking risks.
function sanitizeUnicodeWords(query) {
  return query.replace(/[\s\S]/gu, (char) => {
    if (char === "-") return "-";
    if (char === "_") return " ";
    if (UNICODE_LETTER_NUMBER_REGEX.test(char)) return char;
    if (UNICODE_WHITESPACE_REGEX.test(char)) return " ";
    return " ";
  });
}

function normalizeAndLimitQuery(query) {
  const normalized = sanitizeUnicodeWords(query.toLowerCase()).replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  const limitedTerms = normalized.split(/\s+/).filter(Boolean).slice(0, MAX_QUERY_TERMS);
  const limitedJoined = limitedTerms.join(" ");
  if (limitedJoined.length <= MAX_QUERY_LENGTH) {
    return limitedJoined;
  }

  const lastSpaceBeforeLimit = limitedJoined.lastIndexOf(" ", MAX_QUERY_LENGTH - 1);
  if (lastSpaceBeforeLimit > 0) {
    return limitedJoined.slice(0, lastSpaceBeforeLimit);
  }

  return limitedJoined.slice(0, MAX_QUERY_LENGTH);
}

/**
 * Expand a query with synonyms for improved search relevance
 * Uses Levenshtein distance (max 2 edits) for fuzzy matching
 * Applies sensible limits to avoid runaway work on extremely long queries
 * Normalizes queries by removing punctuation (while preserving hyphens) so added terms are
 * free of special characters, while still returning the caller's original input unchanged.
 * @param {string} query - Search query to expand
 * @returns {Promise<ExpandedQueryResult>} Result with original query, expanded query, and matched terms
 *
 * @pseudocode
 * 1. Guard against empty inputs and return baseline result
 * 2. Load cached synonym map from disk
 * 3. Normalize and cap the query length/term count for predictable processing
 * 4. Compute fuzzy synonym matches for the provided query (max 2 Levenshtein edits)
 * 5. Merge original tokens with matched synonyms and report statistics
 */
export async function expandQuery(query) {
  if (!query || typeof query !== "string") {
    return {
      original: query || "",
      expanded: query || "",
      addedTerms: [],
      synonymsUsed: 0,
      hasExpansion: false
    };
  }

  const synonymMap = await loadSynonyms();
  const normalized = normalizeAndLimitQuery(query);
  const words = new Set(normalized.split(/\s+/).filter(Boolean));

  // Find matching synonyms
  const addedTerms = findSynonymMatches(normalized, synonymMap);

  // Build expanded query by combining original words with new terms
  const allTerms = Array.from(new Set([...words, ...addedTerms]));
  const expanded = allTerms.join(" ");

  return {
    original: query,
    expanded: expanded.trim(),
    addedTerms: Array.from(addedTerms),
    synonymsUsed: addedTerms.size,
    hasExpansion: addedTerms.size > 0
  };
}

/**
 * Get statistics about available synonyms
 * Useful for debugging and monitoring
 * @returns {Promise<SynonymStats>} Statistics about synonym mappings
 *
 * @pseudocode
 * 1. Load synonym mappings from cache/disk
 * 2. Derive counts for mappings and synonym totals
 * 3. Calculate average synonyms per mapping and return sample entries
 */
export async function getSynonymStats() {
  const synonymMap = await loadSynonyms();
  const keys = Object.keys(synonymMap);
  const totalSynonyms = Object.values(synonymMap).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  return {
    totalMappings: keys.length,
    totalSynonyms,
    averageSynonymsPerMapping: totalSynonyms > 0 ? (totalSynonyms / keys.length).toFixed(2) : 0,
    mappingExamples: Object.entries(synonymMap)
      .slice(0, 3)
      .map(([key, synonyms]) => ({ key, synonyms }))
  };
}

/**
 * Clears the in-memory synonym cache and resets the cache hit counter.
 * This is primarily used for testing or to force a fresh load of synonyms.
 */
export function resetSynonymCache() {
  synonymsCache = undefined;
  synonymsCachePromise = undefined;
  synonymCacheHits = 0;
}

/**
 * Returns the number of times the synonym cache was successfully used
 * instead of reloading from disk.
 * @returns {number} The current count of synonym cache hits.
 */
export function getSynonymCacheHits() {
  return synonymCacheHits;
}

export default { expandQuery, getSynonymStats };
