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

/**
 * Determine the opponent's stat choice based on difficulty.
 *
 * @pseudocode
 * 1. When `difficulty` is `hard`:
 *    a. Read all stat values from the opponent card.
 *    b. Find the highest value and return one of the stats with that value.
 * 2. When `difficulty` is `medium`:
 *    a. Read all stat values from the opponent card.
 *    b. Compute the average of those values.
 *    c. Choose randomly among stats whose value is at least the average.
 *    d. If none qualify, fallback to random.
 * 3. Otherwise (`easy`): pick a random stat from `STATS`.
 *
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] Difficulty setting.
 * @returns {string} One of the values from `STATS`.
 */
export function simulateOpponentStat(difficulty = "easy") {
  if (difficulty !== "easy") {
    const card = document.getElementById("computer-card");
    if (card) {
      const values = STATS.map((stat) => ({
        stat,
        value: getStatValue(card, stat)
      }));
      if (difficulty === "hard") {
        const max = Math.max(...values.map((v) => v.value));
        const best = values.filter((v) => v.value === max);
        return best[Math.floor(Math.random() * best.length)].stat;
      }
      if (difficulty === "medium") {
        const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
        const eligible = values.filter((v) => v.value >= avg);
        if (eligible.length > 0) {
          return eligible[Math.floor(Math.random() * eligible.length)].stat;
        }
      }
    }
  }
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

class ClassicBattle {
  constructor() {
    /** @type {ReturnType<typeof createModal> | null} */
    this.quitModal = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.statTimeoutId = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.autoSelectId = null;

    const quitButton = document.getElementById("quit-match-button");
    if (quitButton) {
      quitButton.addEventListener("click", () => {
        this.quitMatch();
      });
    }

    const replayButton = document.getElementById("replay-button");
    if (replayButton) {
      replayButton.addEventListener("click", () => {
        this.handleReplay();
      });
    }
  }

  getStartRound() {
    if (typeof window !== "undefined" && window.startRoundOverride) {
      return window.startRoundOverride;
    }
    return this.startRound.bind(this);
  }

  /**
   * Reset match state and start a new game.
   *
   * @pseudocode
   * 1. Reset engine scores and flags.
   * 2. Hide the summary panel and clear the last round message.
   * 3. Call the start round function to begin a new match.
   */
  async handleReplay() {
    engineReset();
    const panel = document.getElementById("summary-panel");
    if (panel) panel.classList.add("hidden");
    infoBar.clearMessage();
    const startRoundFn = this.getStartRound();
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
  onStatSelectionTimeout() {
    infoBar.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
    this.autoSelectId = setTimeout(() => {
      const randomStat = simulateOpponentStat();
      this.handleStatSelection(randomStat);
    }, 5000);
  }

  /**
   * Update the info bar with current scores.
   *
   * @pseudocode
   * 1. Read scores via `getScores()`.
   * 2. Forward the values to `infoBar.updateScore`.
   */
  syncScoreDisplay() {
    const { playerScore, computerScore } = getScores();
    infoBar.updateScore(playerScore, computerScore);
  }

  createQuitConfirmation(onConfirm) {
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

  async startRound() {
    resetStatButtons();
    disableNextRoundButton();
    await drawCards();
    showSelectionPrompt();
    this.syncScoreDisplay();
    await startTimer(this.handleStatSelection.bind(this));
    this.statTimeoutId = setTimeout(() => this.onStatSelectionTimeout(), 35000);
    updateDebugPanel();
  }

  evaluateRound(stat) {
    const playerContainer = document.getElementById("player-card");
    const computerContainer = document.getElementById("computer-card");
    const playerVal = getStatValue(playerContainer, stat);
    const compVal = getStatValue(computerContainer, stat);
    const result = engineHandleStatSelection(playerVal, compVal);
    if (result.message) {
      showResult(result.message);
    }
    this.syncScoreDisplay();
    updateDebugPanel();
    return result;
  }

  async handleStatSelection(stat) {
    clearTimeout(this.statTimeoutId);
    clearTimeout(this.autoSelectId);
    const clearWaitingMessage = infoBar.showTemporaryMessage("Waiting…");
    const delay = 300 + Math.floor(Math.random() * 401);
    return new Promise((resolve) => {
      setTimeout(async () => {
        await revealComputerCard();
        clearWaitingMessage();
        const result = this.evaluateRound(stat);
        resetStatButtons();
        scheduleNextRound(result, this.getStartRound());
        if (result.matchEnded) {
          showSummary(result);
        }
        updateDebugPanel();
        resolve(result);
      }, delay);
    });
  }

  quitMatch() {
    if (!this.quitModal) {
      this.quitModal = this.createQuitConfirmation(() => {
        const result = engineQuitMatch();
        showResult(result.message);
      });
    }
    const trigger = document.getElementById("quit-match-button");
    this.quitModal.open(trigger ?? undefined);
  }

  _resetForTest() {
    resetSelection();
    engineReset();
    if (typeof window !== "undefined") {
      delete window.startRoundOverride;
    }
    clearTimeout(this.statTimeoutId);
    clearTimeout(this.autoSelectId);
    this.statTimeoutId = null;
    this.autoSelectId = null;
    const timerEl = document.getElementById("next-round-timer");
    if (timerEl) timerEl.textContent = "";
    infoBar.clearMessage();
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
    if (this.quitModal) {
      this.quitModal.element.remove();
      this.quitModal = null;
    }
    this.syncScoreDisplay();
    updateDebugPanel();
  }
}

export const classicBattle = new ClassicBattle();

/**
 * Trigger the Classic Battle quit confirmation modal.
 *
 * @pseudocode
 * 1. Call `classicBattle.quitMatch()` to show the existing confirmation modal.
 */
export function quitMatch() {
  classicBattle.quitMatch();
}

export {
  revealComputerCard,
  enableNextRoundButton,
  disableNextRoundButton,
  updateDebugPanel
} from "./classicBattle/uiHelpers.js";
export { getComputerJudoka } from "./classicBattle/cardSelection.js";
export { scheduleNextRound } from "./classicBattle/timerControl.js";
