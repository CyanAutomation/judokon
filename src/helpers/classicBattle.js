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
  _resetForTest as engineReset,
  STATS
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
let statTimeoutId = null;
let autoSelectId = null;

/**
 * Return a random stat key for the opponent.
 *
 * @pseudocode
 * 1. Pick a random index from `STATS`.
 * 2. Return the stat at that index.
 *
 * @returns {string} One of the values from `STATS`.
 */
export function simulateOpponentStat() {
  return STATS[Math.floor(Math.random() * STATS.length)];
}

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
function showSummary(result) {
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
 * Reset match state and start a new game.
 *
 * @pseudocode
 * 1. Reset engine scores and flags.
 * 2. Hide the summary panel and clear the last round message.
 * 3. Call the start round function to begin a new match.
 */
async function handleReplay() {
  engineReset();
  const panel = document.getElementById("summary-panel");
  if (panel) panel.classList.add("hidden");
  const msgEl = document.getElementById("round-message");
  if (msgEl) msgEl.textContent = "";
  const startRoundFn = getStartRound();
  await startRoundFn();
}

/**
 * Handle stalled stat selection by prompting the player and auto-selecting a
 * random stat after a short delay.
 *
 * @pseudocode
 * 1. Display "Stat selection stalled" via `infoBar.showMessage`.
 * 2. After 5 seconds choose a random stat from `STATS`.
 * 3. Call `handleStatSelection` with the chosen stat.
 */
function onStatSelectionTimeout() {
  infoBar.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  autoSelectId = setTimeout(() => {
    const randomStat = simulateOpponentStat();
    handleStatSelection(randomStat);
  }, 5000);
}

/**
 * Update the info bar with current scores.
 *
 * @pseudocode
 * 1. Read scores via `getScores()`.
 * 2. Forward the values to `infoBar.updateScore`.
 */
function syncScoreDisplay() {
  const { playerScore, computerScore } = getScores();
  infoBar.updateScore(playerScore, computerScore);
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
  statTimeoutId = setTimeout(onStatSelectionTimeout, 35000);
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
  clearTimeout(statTimeoutId);
  clearTimeout(autoSelectId);
  infoBar.showMessage("Waiting…");
  const delay = 300 + Math.floor(Math.random() * 401);
  return new Promise((resolve) => {
    setTimeout(async () => {
        await revealComputerCard();
        infoBar.showMessage("");
        const result = evaluateRound(stat);
        resetStatButtons();
        scheduleNextRound(result, getStartRound());
        if (result.matchEnded) {
            showSummary(result);
        }
        updateDebugPanel();
        resolve(result);
    }, delay);
  });
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
  clearTimeout(statTimeoutId);
  clearTimeout(autoSelectId);
  statTimeoutId = null;
  autoSelectId = null;
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

const quitButton = document.getElementById("quit-match-button");
if (quitButton) {
  quitButton.addEventListener("click", () => {
    quitMatch();
  });
}

const replayButton = document.getElementById("replay-button");
if (replayButton) {
  replayButton.addEventListener("click", () => {
    handleReplay();
  });
}
