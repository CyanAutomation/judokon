import { drawCards, _resetForTest as resetSelection } from "./classicBattle/cardSelection.js";
import {
  startTimer,
  scheduleNextRound,
  handleStatSelectionTimeout
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
  STATS,
  stopTimer
} from "./battleEngine.js";
import * as infoBar from "./setupBattleInfoBar.js";
import { getStatValue, resetStatButtons, showResult } from "./battle/index.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";
import { shouldReduceMotionSync } from "./motionUtils.js";
import { syncScoreDisplay, showMatchSummaryModal } from "./classicBattle/uiService.js";

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
 * Create a new battle state store and attach button handlers.
 *
 * @returns {{quitModal: ReturnType<typeof createModal>|null, statTimeoutId: ReturnType<typeof setTimeout>|null, autoSelectId: ReturnType<typeof setTimeout>|null, compareRaf: number}}
 */
export function createBattleStore() {
  const store = {
    quitModal: null,
    statTimeoutId: null,
    autoSelectId: null,
    compareRaf: 0,
    selectionMade: false
  };
  const quitButton = document.getElementById("quit-match-button");
  if (quitButton) {
    quitButton.addEventListener("click", () => {
      quitMatch(store);
    });
  }
  return store;
}

function getStartRound(store) {
  if (typeof window !== "undefined" && window.startRoundOverride) {
    return window.startRoundOverride;
  }
  return () => startRound(store);
}

/**
 * Reset match state and start a new game.
 *
 * @pseudocode
 * 1. Reset engine scores and flags.
 * 2. Close any open modals and clear the last round message.
 * 3. Call the start round function to begin a new match.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export async function handleReplay(store) {
  engineReset();
  document.querySelectorAll(".modal-backdrop").forEach((m) => {
    if (typeof m.remove === "function") m.remove();
  });
  infoBar.clearMessage();
  const startRoundFn = getStartRound(store);
  await startRoundFn();
}

/**
 * Start a new round by drawing cards and starting timers.
 *
 * @pseudocode
 * 1. Reset buttons and disable the Next Round button.
 * 2. Draw player and opponent cards.
 * 3. Sync the score display and show the selection prompt.
 * 4. Start the round timer and stall timeout.
 * 5. Update the debug panel.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export async function startRound(store) {
  store.selectionMade = false;
  resetStatButtons();
  disableNextRoundButton();
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
  await drawCards();
  syncScoreDisplay();
  showSelectionPrompt();
  await startTimer((stat) => handleStatSelection(store, stat));
  store.statTimeoutId = setTimeout(
    () => handleStatSelectionTimeout(store, (s) => handleStatSelection(store, s)),
    35000
  );
  updateDebugPanel();
}

/**
 * Evaluate a selected stat and update the UI.
 *
 * @pseudocode
 * 1. Read stat values from both cards.
 * 2. Run `engineHandleStatSelection` to get the result.
 * 3. Show result message and stat comparison.
 * 4. Sync scores and update debug panel.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @returns {{message?: string, matchEnded: boolean}}
 */
export function evaluateRound(store, stat) {
  const playerCard = document.getElementById("player-card");
  const computerCard = document.getElementById("computer-card");
  const playerVal = getStatValue(playerCard, stat);
  const computerVal = getStatValue(computerCard, stat);
  const result = engineHandleStatSelection(playerVal, computerVal);
  if (result.message) {
    showResult(result.message);
  }
  showStatComparison(store, stat, playerVal, computerVal);
  syncScoreDisplay();
  updateDebugPanel();
  return result;
}

/**
 * Handle player stat selection with a brief delay to reveal the opponent card.
 *
 * @pseudocode
 * 1. Pause the round timer and clear any pending timeouts.
 * 2. Clear the countdown and show "Opponent is choosing…" in the info bar.
 * 3. After a short delay, reveal the opponent card and evaluate the round.
 * 4. Reset stat buttons and schedule the next round.
 * 5. If the match ended, show the summary panel.
 * 6. Update the debug panel.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @returns {Promise<{matchEnded: boolean}>}
 */
export async function handleStatSelection(store, stat) {
  if (store.selectionMade) {
    return { matchEnded: false };
  }
  store.selectionMade = true;
  // Stop the countdown timer to prevent further ticks
  stopTimer();
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  infoBar.clearTimer();
  infoBar.showMessage("Opponent is choosing…");
  const delay = 300 + Math.floor(Math.random() * 401);
  return new Promise((resolve) => {
    setTimeout(async () => {
      await revealComputerCard();
      const result = evaluateRound(store, stat);
      resetStatButtons();
      scheduleNextRound(result, getStartRound(store));
      if (result.matchEnded) {
        showMatchSummaryModal(result, () => handleReplay(store));
      }
      updateDebugPanel();
      resolve(result);
    }, delay);
  });
}

function createQuitConfirmation(store, onConfirm) {
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

/**
 * Trigger the Classic Battle quit confirmation modal.
 *
 * @pseudocode
 * 1. Create the modal if needed and open it.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export function quitMatch(store) {
  if (!store.quitModal) {
    store.quitModal = createQuitConfirmation(store, () => {
      const result = engineQuitMatch();
      showResult(result.message);
    });
  }
  const trigger = document.getElementById("quit-match-button");
  store.quitModal.open(trigger ?? undefined);
}

/**
 * Show animated stat comparison for the last round.
 *
 * @pseudocode
 * 1. Locate `#round-result` and exit if missing.
 * 2. Extract previous values from its text when present.
 * 3. Increment both player and opponent values toward targets using
 *    `requestAnimationFrame` unless motion is reduced.
 * 4. Update the element text on each frame as "Stat – You: x Opponent: y".
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Stat key selected for the round.
 * @param {number} playerVal - Player's stat value.
 * @param {number} compVal - Opponent's stat value.
 */
export function showStatComparison(store, stat, playerVal, compVal) {
  const el = document.getElementById("round-result");
  if (!el) return;
  cancelAnimationFrame(store.compareRaf);
  const label = stat.charAt(0).toUpperCase() + stat.slice(1);
  const match = el.textContent.match(/You: (\d+).*Opponent: (\d+)/);
  const startPlayer = match ? Number(match[1]) : 0;
  const startComp = match ? Number(match[2]) : 0;
  if (shouldReduceMotionSync()) {
    el.textContent = `${label} – You: ${playerVal} Opponent: ${compVal}`;
    return;
  }
  const startTime = performance.now();
  const duration = 500;
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const p = Math.round(startPlayer + (playerVal - startPlayer) * progress);
    const c = Math.round(startComp + (compVal - startComp) * progress);
    el.textContent = `${label} – You: ${p} Opponent: ${c}`;
    if (progress < 1) {
      store.compareRaf = requestAnimationFrame(step);
    }
  };
  store.compareRaf = requestAnimationFrame(step);
}

/**
 * Reset internal state for tests.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export function _resetForTest(store) {
  resetSelection();
  engineReset();
  if (typeof window !== "undefined") {
    delete window.startRoundOverride;
  }
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  store.statTimeoutId = null;
  store.autoSelectId = null;
  store.selectionMade = false;
  cancelAnimationFrame(store.compareRaf);
  store.compareRaf = 0;
  const timerEl = document.getElementById("next-round-timer");
  if (timerEl) timerEl.textContent = "";
  infoBar.clearMessage();
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
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
export { scheduleNextRound } from "./classicBattle/timerService.js";
