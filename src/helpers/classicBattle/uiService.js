import { getScores } from "../battleEngine.js";
import * as infoBar from "../setupBattleInfoBar.js";

/**
 * Display match summary with final message and scores.
 *
 * @pseudocode
 * 1. Find the summary panel and text elements.
 * 2. Insert the result message and scores.
 * 3. Reveal the panel by removing the hidden class.
 *
 * @param {{message: string, playerScore: number, computerScore: number}} result
 */
export function showSummary(result) {
  const panel = document.getElementById("summary-panel");
  const messageEl = document.getElementById("summary-message");
  const scoreEl = document.getElementById("summary-score");
  if (panel && messageEl && scoreEl) {
    messageEl.textContent = result.message;
    scoreEl.textContent = `Final Score – You: ${result.playerScore} Opponent: ${result.computerScore}`;
    panel.classList.remove("hidden");
  }
}

/**
 * Update the info bar with current scores.
 *
 * @pseudocode
 * 1. Read scores via `getScores()`.
 * 2. Forward the values to `infoBar.updateScore`.
 */
export function syncScoreDisplay() {
  const { playerScore, computerScore } = getScores();
  infoBar.updateScore(playerScore, computerScore);
}
