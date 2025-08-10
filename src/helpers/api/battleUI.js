import { STATS, handleStatSelection } from "../battleEngineFacade.js";

/**
 * Choose an opponent stat based on difficulty and available values.
 *
 * @pseudocode
 * 1. If `difficulty` is `hard` and `values` are provided:
 *    a. Find the maximum value.
 *    b. Return a random stat among those with the maximum.
 * 2. If `difficulty` is `medium` and `values` are provided:
 *    a. Compute the average value.
 *    b. Collect stats at or above the average.
 *    c. If any qualify, return a random one.
 * 3. Otherwise, return a random stat from `STATS`.
 *
 * @param {{stat: string, value: number}[]} values - Stat entries to compare.
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] - Difficulty setting.
 * @returns {string} Chosen stat key.
 */
export function chooseOpponentStat(values, difficulty = "easy") {
  if (difficulty === "hard" && values.length) {
    const max = Math.max(...values.map((v) => v.value));
    const best = values.filter((v) => v.value === max);
    return best[Math.floor(Math.random() * best.length)].stat;
  }
  if (difficulty === "medium" && values.length) {
    const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    const eligible = values.filter((v) => v.value >= avg);
    if (eligible.length > 0) {
      return eligible[Math.floor(Math.random() * eligible.length)].stat;
    }
  }
  return STATS[Math.floor(Math.random() * STATS.length)];
}

/**
 * Evaluate a round using player and opponent stat values.
 *
 * @pseudocode
 * 1. Delegate to `handleStatSelection` on the battle engine with the provided values.
 * 2. Return its result.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{message: string, matchEnded: boolean, playerScore: number, computerScore: number}}
 */
export function evaluateRound(playerVal, opponentVal) {
  return handleStatSelection(playerVal, opponentVal);
}
