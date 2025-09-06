import { SIMILARITY_THRESHOLD } from "../api/vectorSearchPage.js";

/**
 * Score gap required to treat the top result as a clear winner.
 *
 * @summary Minimum difference between the two best strong matches
 * needed to suppress lower-ranked contenders. Tuned empirically so that
 * small gaps (\u003c0.4) still surface multiple results while larger gaps
 * favor precision.
 * @type {number}
 */
const DROP_OFF_THRESHOLD = 0.4;

/**
 * Partition matches into strong and weak groups and choose which to render.
 *
 * @summary Classify matches by similarity and select results to display.
 * @pseudocode
 * 1. Split `matches` into `strongMatches` and `weakMatches` by `SIMILARITY_THRESHOLD`.
 * 2. If multiple strong matches exist and the gap between the top two exceeds
 *    `DROP_OFF_THRESHOLD`, keep only the top match.
 * 3. Otherwise render all strong matches when present.
 * 4. When no strong matches, return the first three weak matches.
 * 5. Return both the strong set and the final selection.
 *
 * @param {Array<{score:number}>} matches - All matches sorted by score.
 * @returns {{strongMatches: Array, toRender: Array}} Partitioned selections.
 */
export function selectTopMatches(matches) {
  const strongMatches = matches.filter((m) => m.score >= SIMILARITY_THRESHOLD);
  const weakMatches = matches.filter((m) => m.score < SIMILARITY_THRESHOLD);
  let toRender;
  if (
    strongMatches.length > 1 &&
    strongMatches[0].score - strongMatches[1].score > DROP_OFF_THRESHOLD
  ) {
    toRender = [strongMatches[0]];
  } else if (strongMatches.length > 0) {
    toRender = strongMatches;
  } else {
    toRender = weakMatches.slice(0, 3);
  }
  return { strongMatches, toRender };
}

export default selectTopMatches;
