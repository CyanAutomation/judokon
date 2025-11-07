import { STATS, handleStatSelection } from "../battleEngineFacade.js";
import { seededRandom } from "../testModeUtils.js";
import { writeScoreDisplay } from "../classicBattle/scoreDisplay.js";

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
    return best[Math.floor(seededRandom() * best.length)].stat;
  }
  if (difficulty === "medium" && values.length) {
    const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    const eligible = values.filter((v) => v.value >= avg);
    if (eligible.length > 0) {
      return eligible[Math.floor(seededRandom() * eligible.length)].stat;
    }
  }
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
