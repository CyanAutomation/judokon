let extractor;

/**
 * Similarity threshold separating strong from weak matches.
 */
export const SIMILARITY_THRESHOLD = 0.6;

/**
 * Score difference threshold for strong matches.
 * When the top score exceeds the second best by more than this value,
 * only the highest scoring result is shown.
 * @type {number}
 */
const DROP_OFF_THRESHOLD = 0.4;

/**
 * Select matches to render based on similarity scores.
 *
 * @pseudocode
 * 1. If `strongMatches` has entries:
 *    a. When multiple strong matches and the score gap between the first two exceeds `DROP_OFF_THRESHOLD`, return only the first.
 *    b. Otherwise, return all strong matches.
 * 2. If no strong matches, return the first three `weakMatches`.
 *
 * @param {Array<{score:number}>} strongMatches - Results meeting the similarity threshold.
 * @param {Array<{score:number}>} weakMatches - Results below the threshold.
 * @returns {Array} Matches chosen for display.
 */
export function selectMatches(strongMatches, weakMatches) {
  if (strongMatches.length > 0) {
    if (
      strongMatches.length > 1 &&
      strongMatches[0].score - strongMatches[1].score > DROP_OFF_THRESHOLD
    ) {
      return [strongMatches[0]];
    }
    return strongMatches;
  }
  return weakMatches.slice(0, 3);
}

/**
 * Load the MiniLM feature extractor on first use.
 *
 * @pseudocode
 * 1. Return the cached `extractor` when available.
 * 2. Dynamically import the Transformers.js `pipeline` helper.
 * 3. Instantiate a quantized feature-extraction pipeline with the MiniLM model and store it.
 *    - On failure, log the error, reset `extractor` to `null`, and rethrow.
 * 4. Return the initialized `extractor`.
 *
 * @returns {Promise<any>} The feature extraction pipeline instance.
 */
export async function getExtractor() {
  if (!extractor) {
    try {
      const { pipeline } = await import(
        "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js"
      );
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true
      });
    } catch (error) {
      console.error("Model failed to load", error);
      extractor = null;
      throw error;
    }
  }
  return extractor;
}

/**
 * Preload the feature extractor without awaiting its result.
 *
 * @pseudocode
 * 1. Call `getExtractor()` to trigger the model download.
 * 2. Ignore any errors to avoid blocking page initialization.
 */
export function preloadExtractor() {
  getExtractor().catch(() => {});
}

/**
 * Inject a custom extractor for testing.
 * @param {any} model - Mock extractor to use.
 */
export function __setExtractor(model) {
  extractor = model;
}
