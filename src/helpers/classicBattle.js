import { drawCards, _resetForTest as resetSelection } from "./classicBattle/cardSelection.js";
import { startTimer, scheduleNextRound } from "./classicBattle/timerControl.js";
import {
  showSelectionPrompt,
  revealComputerCard,
  disableNextRoundButton,
  updateDebugPanel
} from "./classicBattle/uiHelpers.js";
import {
  handleStatSelection as engineHandleStatSelection,
  quitMatch as engineQuitMatch,
  getScores,
  _resetForTest as engineReset
} from "./battleEngine.js";
import * as infoBar from "./setupBattleInfoBar.js";
import { getStatValue, resetStatButtons, showResult } from "./battle/index.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";

export function getStartRound() {
  if (typeof window !== "undefined" && window.startRoundOverride) {
    return window.startRoundOverride;
  }
  return startRound;
}

let quitModal = null;

/**
 * Update the info bar with current scores and show a waiting message when
 * synchronizing with the backend fails.
 *
 * @pseudocode
 * 1. Attempt to read scores via `getScores()`.
 * 2. When scores are not numbers or an error occurs, display
 *    `"Waiting…"` using `infoBar.showMessage` and return false.
 * 3. Otherwise, update the score display and return true.
 *
 * @returns {boolean} True when scores were updated, false on failure.
 */
function syncScoreDisplay() {
  try {
    const { playerScore, computerScore } = getScores();
    if (typeof playerScore === "number" && typeof computerScore === "number") {
      infoBar.updateScore(playerScore, computerScore);
      return true;
    }
  } catch {
    // ignore error and fall through to waiting message
  }
  infoBar.showMessage("Waiting…");
  return false;
}

function createQuitConfirmation(onConfirm) {
  const title = document.createElement("h2");
  title.id = "quit-modal-title";
  title.textContent = "Quit the match?";

  const desc = document.createElement("p");
  desc.id = "quit-modal-desc";
  desc.textContent = "Your progress will be lost.";

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = createButton("Cancel", {
    id: "cancel-quit-button",
    className: "secondary-button"
  });
  const quit = createButton("Quit", { id: "confirm-quit-button" });
  actions.append(cancel, quit);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);

  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  cancel.addEventListener("click", modal.close);
  quit.addEventListener("click", () => {
    onConfirm();
    modal.close();
    window.location.href = "../../index.html";
  });
  document.body.appendChild(modal.element);
  return modal;
}

export async function startRound() {
  resetStatButtons();
  disableNextRoundButton();
  await drawCards();
  showSelectionPrompt();
  syncScoreDisplay();
  await startTimer(handleStatSelection);
  updateDebugPanel();
}

export function evaluateRound(stat) {
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  const playerVal = getStatValue(playerContainer, stat);
  const compVal = getStatValue(computerContainer, stat);
  const result = engineHandleStatSelection(playerVal, compVal);
  if (result.message) {
    showResult(result.message);
  }
  syncScoreDisplay();
  updateDebugPanel();
  return result;
}

export async function handleStatSelection(stat) {
  await revealComputerCard();
  const result = evaluateRound(stat);
  resetStatButtons();
  scheduleNextRound(result, getStartRound());
  updateDebugPanel();
}

export function quitMatch() {
  if (!quitModal) {
    quitModal = createQuitConfirmation(() => {
      const result = engineQuitMatch();
      showResult(result.message);
    });
  }
  const trigger = document.getElementById("quit-match-button");
  quitModal.open(trigger ?? undefined);
}

export function _resetForTest() {
  resetSelection();
  engineReset();
  if (typeof window !== "undefined") {
    delete window.startRoundOverride;
  }
  const timerEl = document.getElementById("next-round-timer");
  if (timerEl) timerEl.textContent = "";
  const resultEl = document.getElementById("round-message");
  if (resultEl) resultEl.textContent = "";
  const nextBtn = document.getElementById("next-round-button");
  if (nextBtn) {
    const clone = nextBtn.cloneNode(true);
    nextBtn.replaceWith(clone);
    clone.disabled = true;
  }
  const quitBtn = document.getElementById("quit-match-button");
  if (quitBtn) {
    quitBtn.replaceWith(quitBtn.cloneNode(true));
  }
  if (quitModal) {
    quitModal.element.remove();
    quitModal = null;
  }
  syncScoreDisplay();
  updateDebugPanel();
}

export {
  revealComputerCard,
  enableNextRoundButton,
  disableNextRoundButton,
  updateDebugPanel
} from "./classicBattle/uiHelpers.js";
export { getComputerJudoka } from "./classicBattle/cardSelection.js";
export { scheduleNextRound } from "./classicBattle/timerControl.js";
export { syncScoreDisplay as _syncScoreDisplay };

const quitButton = document.getElementById("quit-match-button");
if (quitButton) {
  quitButton.addEventListener("click", () => {
    quitMatch();
  });
}
