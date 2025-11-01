/**
 * Query expansion utility for MCP server
 * Provides explicit control over query expansion for improved search relevance
 */

import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

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
 * @property {string|number} averageSynonymsPerMapping - Average synonyms per mapping (fixed decimal string when calculable).
 * @property {{ key: string, synonyms: string[] }[]} mappingExamples - Example synonym entries for debugging.
 */

let synonymsCache;

/**
 * Load the synonym mapping JSON
 * @returns {Promise<Record<string, string[]>>} Synonym map or empty object on failure
 */
async function loadSynonyms() {
  if (!synonymsCache) {
    try {
      synonymsCache = await fetchJson(`${DATA_DIR}synonyms.json`);
    } catch (err) {
      console.error("Failed to load synonyms.json:", err.message);
      synonymsCache = {};
    }
  }
  return synonymsCache;
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

/**
 * Expand a query with synonyms for improved search relevance
 * Uses Levenshtein distance (max 2 edits) for fuzzy matching
 * @param {string} query - Search query to expand
 * @returns {Promise<ExpandedQueryResult>} Result with original query, expanded query, and matched terms
 *
 * @pseudocode
 * 1. Guard against empty inputs and return baseline result
 * 2. Load cached synonym map from disk
 * 3. Compute fuzzy synonym matches for the provided query
 * 4. Merge original tokens with matched synonyms and report statistics
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
  const lower = query.toLowerCase();
  const words = new Set(lower.split(/\s+/).filter(Boolean));

  // Find matching synonyms
  const addedTerms = findSynonymMatches(query, synonymMap);

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

export default { expandQuery, getSynonymStats };
