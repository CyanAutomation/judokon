import vectorSearch from "../vectorSearch/index.js";
import { getExtractor } from "../api/vectorSearchPage.js";

function isIterable(value) {
  return value !== null && value !== undefined && typeof value[Symbol.iterator] === "function";
}

/**
 * Expand the query and generate its vector representation.
 *
 * @summary Expand query with synonyms and encode a vector.
 * @pseudocode
 * 1. Split the query into lowercase terms.
 * 2. Expand the query using domain-specific synonyms.
 * 3. Obtain the feature extractor and generate a mean-pooled embedding.
 *    - If the result has a `data` property, ensure it is iterable.
 *    - Otherwise ensure the result itself is iterable.
 * 4. Convert the iterable into a plain array and return the terms and vector.
 *
 * @param {string} query - Raw query string from the user.
 * @returns {Promise<{terms: string[], vector: number[]}>} Processed query data.
 */
export async function buildQueryVector(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = await vectorSearch.expandQueryWithSynonyms(query);
  const model = await getExtractor();
  const result = await model(expanded, { pooling: "mean" });
  let source;
  if (result && typeof result === "object" && "data" in result) {
    if (!isIterable(result.data)) {
      throw new TypeError("Extractor result.data is not iterable");
    }
    source = result.data;
  } else {
    if (!isIterable(result)) {
      throw new TypeError("Extractor result is not iterable");
    }
    source = result;
  }
  const vector = Array.from(source);
  return { terms, vector };
}

export default buildQueryVector;
