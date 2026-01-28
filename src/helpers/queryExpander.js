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
 * Find matching synonym mappings for a query
 * Uses exact matches against the full query or individual query terms.
 * @param {string} query - Input query string
 * @param {Record<string, string[]>} synonymMap - Synonym mapping
 * @returns {Set<string>} Matched synonym expansions
 * @private
 */
function findSynonymMatches(query, synonymMap) {
  const lower = query.toLowerCase().trim();
  const words = new Set(lower.split(/\s+/).filter(Boolean));
  const matches = new Set();

  for (const [key, synonyms] of Object.entries(synonymMap)) {
    const variants = Array.isArray(synonyms) ? synonyms : [];
    const allTerms = [key, ...variants].map((term) => term.toLowerCase());

    // Check if any variant matches the query (exact only).
    const isMatched = allTerms.some((term) => term === lower || words.has(term));

    // Add all synonyms if match found
    if (isMatched) {
      variants.forEach((v) => matches.add(v.toLowerCase()));
    }
  }

  return matches;
}

/**
 * Expand a query with synonyms for improved search relevance
 * Uses exact matches only for synonym expansion.
 * @param {string} query - Search query to expand
 * @returns {Promise<ExpandedQueryResult>} Result with original query, expanded query, and matched terms
 *
 * @pseudocode
 * 1. Guard against empty inputs and return baseline result
 * 2. Load cached synonym map from disk
 * 3. Compute exact synonym matches for the provided query
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
  const normalized = query.toLowerCase().trim();
  const words = new Set(
    normalized.split(/\s+/).filter(Boolean).slice(0, MAX_QUERY_TERMS)
  );

  // Find matching synonyms
  const synonymMatches = findSynonymMatches(normalized, synonymMap);

  // Split multi-word synonyms into individual terms to prevent duplication in expanded query.
  // E.g., "grip fighting" becomes ["grip", "fighting"] so each word is treated atomically
  // during deduplication, avoiding double-weighting in embeddings and keyword search.
  const addedTermsArray = Array.from(synonymMatches).flatMap((term) =>
    term.split(/\s+/).filter(Boolean)
  );
  const addedTermsSet = new Set(addedTermsArray);

  // Build expanded query by combining original words with new terms.
  // Deduplication rule: each normalized term should appear exactly once so
  // embeddings and keyword search do not overweight repeated tokens.
  const dedupedTerms = Array.from(new Set([...words, ...addedTermsSet]));
  const expanded = dedupedTerms.join(" ").slice(0, MAX_QUERY_LENGTH);

  return {
    original: query,
    expanded: expanded.trim(),
    addedTerms: addedTermsArray,
    synonymsUsed: addedTermsSet.size,
    hasExpansion: addedTermsSet.size > 0
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
 * Resets the internal synonym cache and related state variables.
 * This function clears the in-memory cache of synonyms, forcing a fresh load
 * from the `synonyms.json` file on the next `loadSynonyms` call. This is useful
 * for testing, or when the underlying synonym data is known to have changed.
 *
 * @returns {void}
 * @pseudocode
 * 1. Set the global `synonymsCache` to `undefined`.
 * 2. Set the global `synonymsCachePromise` to `undefined`.
 * 3. Set the global `synonymCacheHits` counter to `0`.
 */
export function resetSynonymCache() {
  synonymsCache = undefined;
  synonymsCachePromise = undefined;
  synonymCacheHits = 0;
}

/**
 * Returns the current count of synonym cache hits.
 * @returns {number} The current count of synonym cache hits.
 *
 * @pseudocode
 * 1. Return the value of synonymCacheHits.
 */
export function getSynonymCacheHits() {
  return synonymCacheHits;
}

export default { expandQuery, getSynonymStats };
