import { getScores } from "../battleEngine.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";

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

/**
 * Show a match summary modal with result message and scores.
 *
 * @pseudocode
 * 1. Build title and score elements.
 * 2. Create Quit and Next buttons using `createButton`.
 * 3. Assemble the modal via `createModal` and append it to the DOM.
 * 4. Quit navigates to `index.html`; Next closes the modal and runs `onNext`.
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
    window.location.href = "../../index.html";
  });

  next.addEventListener("click", () => {
    modal.close();
    if (typeof onNext === "function") onNext();
  });

  document.body.appendChild(modal.element);
  modal.open();
  return modal;
}
