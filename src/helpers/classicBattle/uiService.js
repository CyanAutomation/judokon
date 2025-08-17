import { getScores } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { navigateToHome } from "../navUtils.js";

/**
 * Update the scoreboard with current scores.
 *
 * @pseudocode
 * 1. Read scores via `getScores()`.
 * 2. Forward the values to `scoreboard.updateScore`.
 */
export function syncScoreDisplay() {
  const { playerScore, computerScore } = getScores();
  if (typeof scoreboard.updateScore === "function") {
    scoreboard.updateScore(playerScore, computerScore);
    return;
  }
  // Fallback for tests that partially mock setupScoreboard without updateScore
  const el = document.getElementById("score-display");
  if (el) {
    let playerSpan = el.firstElementChild;
    let opponentSpan = el.lastElementChild;
    if (!playerSpan || !opponentSpan) {
      playerSpan = document.createElement("span");
      opponentSpan = document.createElement("span");
      el.append(playerSpan, opponentSpan);
    }
    playerSpan.textContent = `You: ${playerScore}`;
    opponentSpan.textContent = `\nOpponent: ${computerScore}`;
  }
}

/**
 * Show a match summary modal with result message and scores.
 *
 * @pseudocode
 * 1. Build title and score elements.
 * 2. Create Quit and Next buttons using `createButton`.
 * 3. Assemble the modal via `createModal` and append it to the DOM.
 * 4. Both buttons close and destroy the modal:
 *    - Quit navigates to `index.html`.
 *    - Next runs `onNext`.
 *
 * @param {{message: string, playerScore: number, computerScore: number}} result
 * @param {Function} onNext Callback invoked when starting the next match.
 * @returns {ReturnType<typeof createModal>} Created modal instance.
 */
export function showMatchSummaryModal(result, onNext) {
  const title = document.createElement("h2");
  title.id = "match-summary-title";
  title.textContent = result.message;

  const scoreEl = document.createElement("p");
  scoreEl.id = "match-summary-score";
  scoreEl.textContent = `Final Score – You: ${result.playerScore} Opponent: ${result.computerScore}`;

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const quit = createButton("Quit Match", {
    id: "match-summary-quit",
    className: "secondary-button"
  });

  const next = createButton("Next Match", { id: "match-summary-next" });

  actions.append(quit, next);

  const frag = document.createDocumentFragment();
  frag.append(title, scoreEl, actions);

  const modal = createModal(frag, { labelledBy: title });

  quit.addEventListener("click", () => {
    modal.close();
    modal.destroy();
    // Navigate to home (robust base path handling)
    navigateToHome();
  });

  next.addEventListener("click", () => {
    modal.close();
    modal.destroy();
    if (typeof onNext === "function") onNext();
  });

  document.body.appendChild(modal.element);
  modal.open();
  return modal;
}
