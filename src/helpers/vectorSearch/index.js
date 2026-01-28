import { loadEmbeddings, CURRENT_EMBEDDING_VERSION } from "./loader.js";
import { findMatches } from "./scorer.js";
import { fetchContextById } from "./context.js";
import { expandQuery as expandQueryBase } from "../queryExpander.js";

/**
 * Expand a query using synonyms, preserving the legacy vector-search behavior.
 *
 * @param {string} query - Raw user query.
 * @returns {Promise<string>} Expanded query string.
 */
async function expandQuery(query) {
  const result = await expandQueryBase(query);
  return result.expanded;
}
}

/**
 * Centralized vector search API.
 *
 * @pseudocode
 * 1. Re-export helpers from existing modules under a single object.
 * 2. Provide access to embedding utilities, scoring, and query expansion.
 */
const vectorSearch = {
  loadEmbeddings,
  findMatches,
  expandQuery,
  fetchContextById,
  CURRENT_EMBEDDING_VERSION
};

export default vectorSearch;
