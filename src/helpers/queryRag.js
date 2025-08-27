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
export async function queryRag(question) {
  const expanded = await vectorSearch.expandQueryWithSynonyms(question);
  const extractor = await getExtractor();
  const embedding = await extractor(expanded, { pooling: "mean" });
  const source =
    embedding && typeof embedding === "object" && "data" in embedding ? embedding.data : embedding;
  if (!isIterable(source)) return [];
  const vector = Array.from(source);
  return vectorSearch.findMatches(vector, 5, [], question);
}

export default queryRag;
