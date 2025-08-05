import { drawCards, _resetForTest as resetSelection } from "./classicBattle/cardSelection.js";
import {
  startTimer,
  scheduleNextRound,
  scheduleStatSelectionTimeout,
  clearStatSelectionTimers
} from "./classicBattle/timerService.js";
import {
  showSelectionPrompt,
  revealComputerCard,
  disableNextRoundButton,
  updateDebugPanel
} from "./classicBattle/uiHelpers.js";
import {
  handleStatSelection as engineHandleStatSelection,
  quitMatch as engineQuitMatch,
  _resetForTest as engineReset,
  STATS
} from "./battleEngine.js";
import * as infoBar from "./setupBattleInfoBar.js";
import { getStatValue, resetStatButtons, showResult } from "./battle/index.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";
import { showSummary, syncScoreDisplay } from "./classicBattle/uiService.js";

/**
 * Create a store for Classic Battle state.
 *
 * @returns {{quitModal: any, statTimeoutId: any, autoSelectId: any}}
 */
export function createBattleStore() {
  return { quitModal: null, statTimeoutId: null, autoSelectId: null };
}

export const battleStore = createBattleStore();

/**
 * Initialize Classic Battle event listeners.
 *
 * @pseudocode
 * 1. Attach click handlers to Quit and Replay buttons.
 * 2. Handlers call `quitMatch` and `handleReplay` with the provided store.
 *
 * @param {object} store
 */
export function initClassicBattle(store = battleStore) {
  const quitButton = document.getElementById("quit-match-button");
  if (quitButton) {
    quitButton.addEventListener("click", () => quitMatch(store));
  }
  const replayButton = document.getElementById("replay-button");
  if (replayButton) {
    replayButton.addEventListener("click", () => handleReplay(store));
  }
}

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

export async function startRound(store = battleStore) {
  resetStatButtons();
  disableNextRoundButton();
  await drawCards();
  syncScoreDisplay();
  showSelectionPrompt();
  await startTimer((stat) => handleStatSelection(store, stat));
  scheduleStatSelectionTimeout(store, handleStatSelection, () => simulateOpponentStat());
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

export async function handleStatSelection(store, stat) {
  if (typeof stat === "undefined") {
    stat = store;
    store = battleStore;
  }
  clearStatSelectionTimers(store);
  const clearWaitingMessage = infoBar.showTemporaryMessage("Waiting…");
  const delay = 300 + Math.floor(Math.random() * 401);
  return new Promise((resolve) => {
    setTimeout(async () => {
      await revealComputerCard();
      clearWaitingMessage();
      const result = evaluateRound(stat);
      resetStatButtons();
      scheduleNextRound(result, () => startRound(store));
      if (result.matchEnded) {
        showSummary(result);
      }
      updateDebugPanel();
      resolve(result);
    }, delay);
  });
}

export async function handleReplay(store = battleStore) {
  engineReset();
  const panel = document.getElementById("summary-panel");
  if (panel) panel.classList.add("hidden");
  infoBar.clearMessage();
  await startRound(store);
}

/**
 * Trigger the Classic Battle quit confirmation modal.
 *
 * @pseudocode
 * 1. Call `createQuitConfirmation` if needed and open the modal.
 *
 * @param {object} store
 */
export function quitMatch(store = battleStore) {
  if (!store.quitModal) {
    store.quitModal = createQuitConfirmation(() => {
      const result = engineQuitMatch();
      showResult(result.message);
    });
  }
  const trigger = document.getElementById("quit-match-button");
  store.quitModal.open(trigger ?? undefined);
}

export function _resetForTest(store = battleStore) {
  resetSelection();
  engineReset();
  if (typeof window !== "undefined") {
    delete window.startRoundOverride;
  }
  clearStatSelectionTimers(store);
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
  if (store.quitModal) {
    store.quitModal.element.remove();
    store.quitModal = null;
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
