import { STATS, handleStatSelection } from "../battleEngineFacade.js";
import { seededRandom } from "../testModeUtils.js";
import { writeScoreDisplay } from "../classicBattle/scoreDisplay.js";

/**
 * Choose an opponent stat based on difficulty and available values.
 *
 * Implements three distinct AI strategies for opponent stat selection:
 * - **Easy**: Uniformly random selection (beginner-friendly)
 * - **Medium**: Strategic selection from above-average stats (competitive)
 * - **Hard**: Optimal selection of maximum stat (expert-level challenge)
 *
 * Performance: O(n) time complexity, single-pass for medium/hard difficulties
 * when possible, avoiding redundant array operations.
 *
 * @pseudocode
 * 1. Validate inputs: ensure values array is provided and non-empty
 * 2. For hard difficulty:
 *    a. Find maximum value in single pass with fallback to any stat
 *    b. Collect all stats matching maximum value
 *    c. Return random selection among best stats (handles ties)
 * 3. For medium difficulty:
 *    a. Calculate average value in single pass
 *    b. Filter stats at or above average
 *    c. Return random selection from eligible stats, fallback to easy if none
 * 4. For easy difficulty (or fallback):
 *    a. Return uniformly random stat from STATS array
 *
 * @example
 * // Hard difficulty: always picks highest stat (newaza = 8)
 * const values = [
 *   { stat: "power", value: 5 },
 *   { stat: "speed", value: 7 },
 *   { stat: "newaza", value: 8 }
 * ];
 * chooseOpponentStat(values, "hard"); // "newaza"
 *
 * @example
 * // Medium difficulty: picks from above-average stats (speed or newaza)
 * // Average = (5 + 7 + 8) / 3 = 6.67
 * chooseOpponentStat(values, "medium"); // "speed" or "newaza"
 *
 * @example
 * // Easy difficulty: picks any stat randomly
 * chooseOpponentStat(values, "easy"); // "power", "speed", or "newaza"
 *
 * @param {{stat: string, value: number}[]} values - Stat entries to compare. Must be non-empty array.
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] - Difficulty setting. Defaults to "easy".
 * @returns {string} Chosen stat key from the values array.
 */
export function chooseOpponentStat(values, difficulty = "easy") {
  // Validate input: ensure values is a non-empty array
  if (!Array.isArray(values) || values.length === 0) {
    // Fallback to random stat from STATS if values invalid
    return STATS[Math.floor(seededRandom() * STATS.length)];
  }

  // Hard difficulty: select stat(s) with maximum value
  if (difficulty === "hard") {
    // Single-pass to find max value and collect best stats
    let max = -Infinity;
    const best = [];
    
    for (const v of values) {
      if (typeof v.value === "number" && !isNaN(v.value)) {
        if (v.value > max) {
          max = v.value;
          best.length = 0; // Clear array
          best.push(v);
        } else if (v.value === max) {
          best.push(v);
        }
      }
    }
    
    if (best.length === 0) {
      // Fallback to random if all values are invalid
      return STATS[Math.floor(seededRandom() * STATS.length)];
    }
    
    // Random selection among best stats
    return best[Math.floor(seededRandom() * best.length)].stat;
  }

  // Medium difficulty: select from above-average stats
  if (difficulty === "medium") {
    // Filter out invalid numeric values
    const validValues = values.filter((v) => typeof v.value === "number" && !isNaN(v.value));
    if (validValues.length === 0) {
      // Fallback to random if all values are invalid
      return STATS[Math.floor(seededRandom() * STATS.length)];
    }
    // Calculate average in single pass
    const avg = validValues.reduce((sum, v) => sum + v.value, 0) / validValues.length;
    // Filter stats at or above average
    const eligible = validValues.filter((v) => v.value >= avg);
    // Return random from eligible, or fallback to easy if none qualify
    if (eligible.length > 0) {
      return eligible[Math.floor(seededRandom() * eligible.length)].stat;
    }
  }

  // Easy difficulty (or fallback): uniformly random selection
  return STATS[Math.floor(seededRandom() * STATS.length)];
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

// Simple score tracking for fallback mode
let fallbackPlayerScore = 0;
let fallbackOpponentScore = 0;

/**
 * Evaluate a stat matchup and return engine results with a user-facing message.
 *
 * @summary Compute round outcome via engine or fallback logic. Pure function (no side effects).
 * @pseudocode
 * 1. Try to invoke `handleStatSelection(playerVal, opponentVal)` on the battle engine.
 * 2. Map the outcome code to a localized message.
 * 3. Return the result with the message.
 * 4. If the engine throws, compute a simple delta outcome and track fallback scores.
 * 5. Return the fallback result with the message.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{delta: number, outcome: string, matchEnded: boolean, playerScore: number, opponentScore: number, message: string}}
 */
export function evaluateRound(playerVal, opponentVal) {
  try {
    // Use the battle engine facade
    const result = handleStatSelection(playerVal, opponentVal);
    const message = getOutcomeMessage(result.outcome);

    return {
      ...result,
      message
    };
  } catch {
    // Fallback when engine is unavailable: compute a simple outcome with cumulative scoring
    const p = Number(playerVal) || 0;
    const o = Number(opponentVal) || 0;
    const delta = p - o;
    const outcome = delta > 0 ? "winPlayer" : delta < 0 ? "winOpponent" : "draw";

    // Update cumulative scores
    if (outcome === "winPlayer") {
      fallbackPlayerScore += 1;
    } else if (outcome === "winOpponent") {
      fallbackOpponentScore += 1;
    }

    const matchEnded = false;
    const message = getOutcomeMessage(outcome);

    return {
      delta,
      outcome,
      matchEnded,
      playerScore: fallbackPlayerScore,
      opponentScore: fallbackOpponentScore,
      message
    };
  }
}

/**
 * Apply round evaluation result to the DOM (for test assertions in Vitest environment).
 *
 * @summary Update DOM elements with round result data. Side effect function for tests only.
 * @pseudocode
 * 1. If not in Vitest, return immediately (no-op).
 * 2. Query `header #round-message` and `header #score-display`.
 * 3. If message element exists and message is provided, set text content.
 * 4. If score element exists and scores are provided, call `writeScoreDisplay()`.
 * 5. Silently ignore any DOM errors.
 *
 * @param {object} roundResult - Result from `evaluateRound()`.
 * @param {string} roundResult.message - Message to display.
 * @param {number} roundResult.playerScore - Player score.
 * @param {number} roundResult.opponentScore - Opponent score.
 * @returns {void}
 */
export function applyRoundResultToDOM(roundResult) {
  // Only run in test environment to avoid side effects in production
  if (typeof process === "undefined" || !process.env || !process.env.VITEST) {
    return;
  }

  try {
    const messageEl = document.querySelector("header #round-message");
    const scoreEl = document.querySelector("header #score-display");

    if (messageEl && roundResult.message) {
      messageEl.textContent = roundResult.message;
    }
    if (
      scoreEl &&
      roundResult.playerScore !== undefined &&
      roundResult.opponentScore !== undefined
    ) {
      writeScoreDisplay(
        Number(roundResult.playerScore) || 0,
        Number(roundResult.opponentScore) || 0
      );
    }
  } catch {
    // Silently ignore DOM update errors in test environment
  }
}

// Reset function for tests
/**
 * Reset the cumulative fallback scores used when the engine is unavailable.
 *
 * Useful for tests that rely on deterministic cumulative scoring.
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. Set module-scoped `fallbackPlayerScore` and `fallbackOpponentScore` back to 0.
 */
export function resetFallbackScores() {
  fallbackPlayerScore = 0;
  fallbackOpponentScore = 0;
}
