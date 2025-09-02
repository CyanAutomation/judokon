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

// Map outcome codes (string values produced by the engine) to messages.
// Using literal keys avoids importing engine constants during module evaluation,
// which simplifies testing when the facade is mocked.
const OUTCOME_MESSAGES = {
  winPlayer: "You win the round!",
  winOpponent: "Opponent wins the round!",
  draw: "Tie – no score!",
  matchWinPlayer: "You win the match!",
  matchWinOpponent: "Opponent wins the match!",
  matchDraw: "Match ends in a tie!",
  quit: "You quit the match. You lose!",
  interruptRound: "Round interrupted",
  interruptMatch: "Match interrupted",
  roundModified: "Round modified",
  error: "Error"
};

/**
 * Map an outcome code to a localized message.
 *
 * @pseudocode
 * 1. Use a lookup table keyed by outcome codes.
 * 2. Return the matching message or an empty string.
 *
 * @param {string} outcome - Outcome code from the engine.
 * @returns {string} Localized message.
 */
export function getOutcomeMessage(outcome) {
  return OUTCOME_MESSAGES[outcome] || "";
}

/**
 * @summary Evaluate a round and map the outcome to a message.
 *
 * @pseudocode
 * 1. Delegate to `handleStatSelection` on the battle engine with the provided values.
 * 2. Map the returned outcome code to a user-facing message.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{delta: number, outcome: string, matchEnded: boolean, playerScore: number, opponentScore: number, message: string}}
 */
export function evaluateRound(playerVal, opponentVal) {
  const result = handleStatSelection(playerVal, opponentVal);
  return { ...result, message: getOutcomeMessage(result.outcome) };
}
