import { loadEmbeddings, CURRENT_EMBEDDING_VERSION } from "./loader.js";
import { findMatches } from "./scorer.js";
import { fetchContextById } from "./context.js";
import { expandQueryWithSynonyms } from "../vectorSearchQuery.js";

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
  expandQueryWithSynonyms,
  fetchContextById,
  CURRENT_EMBEDDING_VERSION
};

export default vectorSearch;
