import {
  loadEmbeddings,
  findMatches,
  fetchContextById,
  CURRENT_EMBEDDING_VERSION
} from "../vectorSearch.js";
import { expandQueryWithSynonyms } from "../vectorSearchQuery.js";

/**
 * Centralized vector search API.
 *
 * @pseudocode
 * 1. Re-export helpers from existing modules under a single object.
 * 2. Provide access to embedding utilities and query expansion.
 */
const vectorSearch = {
  loadEmbeddings,
  findMatches,
  expandQueryWithSynonyms,
  fetchContextById,
  CURRENT_EMBEDDING_VERSION
};

export default vectorSearch;
