import { isNodeEnvironment } from "../env.js";

let extractor;

/**
 * Similarity threshold separating strong from weak matches.
 *
 * @summary Score threshold used to classify strong matches returned by the vector search.
 * @pseudocode
 * 1. A match with score >= SIMILARITY_THRESHOLD is considered a strong match.
 * 2. Consumers use this value to decide whether to show a strong result warning.
 *
 * @returns {number} Threshold value between 0 and 1.
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
 * 1. If `extractor` is already initialized (cached), return it immediately.
 * 2. If `extractor` is not initialized, begin a `try...catch` block to handle potential loading errors:
 *    a. Inside the `try` block:
 *       i. Import the `pipeline` function from Transformers.js (use CDN in browsers, local package in Node).
 *       ii. Instantiate a feature-extraction pipeline using the "Xenova/all-MiniLM-L6-v2" model, ensuring it's quantized.
 *       iii. Assign the created pipeline instance to `extractor`.
 *    b. In the `catch` block (if an error occurs during loading):
 *       i. Log an error message "Model failed to load" along with the `error` object to the console.
 *       ii. Reset `extractor` to `null` to ensure that the next call will re-attempt loading.
 *       iii. Re-throw the `error` to propagate the failure to the caller.
 * 3. Return the initialized `extractor` instance.
 *
 * @returns {Promise<any>} The feature extraction pipeline instance.
 */
export async function getExtractor() {
  if (!extractor) {
    try {
      if (isNodeEnvironment()) {
        const { pipeline } = await import("@xenova/transformers");
        extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
          quantized: true
        });
      } else {
        const { pipeline } = await import(
          "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js"
        );
        extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
          quantized: true
        });
      }
    } catch (error) {
      console.error("Model failed to load", error);
      extractor = null;
      throw error;
    }
  }
  return extractor;
}

/**
 * Preload the feature extractor in the background.
 *
 * @summary Trigger extractor initialization to reduce first-call latency.
 * @pseudocode
 * 1. Call `getExtractor()` to start loading the model.
 * 2. Swallow any errors so initialization is non-blocking.
 * @returns {void}
 */
export function preloadExtractor() {
  getExtractor().catch(() => {});
}

/**
 * Inject a custom extractor implementation (test helper).
 *
 * @summary Replace the internal `extractor` instance for testing or mocking.
 * @pseudocode
 * 1. Assign the provided `model` to the internal `extractor` variable so subsequent calls use it.
 * @param {any} model - Mock or alternative extractor to use.
 * @returns {void}
 */
export function __setExtractor(model) {
  extractor = model;
}
