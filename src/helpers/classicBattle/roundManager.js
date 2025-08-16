import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { startTimer, handleStatSelectionTimeout, onNextButtonClick } from "./timerService.js";
import { showSelectionPrompt, disableNextRoundButton, updateDebugPanel } from "./uiHelpers.js";
import { _resetForTest as resetEngineForTest } from "../battleEngineFacade.js";
import * as battleEngine from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { resetStatButtons } from "../battle/index.js";
import { syncScoreDisplay } from "./uiService.js";
import { handleStatSelection } from "./selectionHandler.js";
import { quitMatch } from "./quitModal.js";
import { cancel as cancelFrame, stop as stopScheduler } from "../../utils/scheduler.js";
import { resetSkipState } from "./skipHandler.js";

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
 * 2. Close any open modals and clear the scoreboard message.
 * 3. Call the start round function to begin a new match.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export async function handleReplay(store) {
  resetEngineForTest();
  if (store.quitModal) {
    store.quitModal.destroy();
    store.quitModal = null;
  }
  document.querySelectorAll(".modal-backdrop").forEach((m) => {
    if (typeof m.remove === "function") m.remove();
  });
  scoreboard.clearMessage();
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
 * 4. Update the round counter using `battleEngine.getRoundsPlayed() + 1`.
 * 5. Start the round timer and stall timeout.
 * 6. Update the debug panel.
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
  const currentRound = battleEngine.getRoundsPlayed() + 1;
  scoreboard.updateRoundCounter(currentRound);
  showSelectionPrompt();
  await startTimer((stat, opts) => handleStatSelection(store, stat, opts));
  store.statTimeoutId = setTimeout(
    () => handleStatSelectionTimeout(store, (s, opts) => handleStatSelection(store, s, opts)),
    35000
  );
  updateDebugPanel();
}

/**
 * Reset the Next Round button to its initial disabled state.
 *
 * @pseudocode
 * 1. Locate `#next-button` and exit if missing.
 * 2. Replace it with a cloned element to drop event listeners.
 * 3. Remove `data-next-ready` and set the `disabled` attribute on the clone.
 *
 * @returns {void}
 */
export function resetGame() {
  const nextBtn = document.getElementById("next-button");
  if (nextBtn) {
    const clone = nextBtn.cloneNode(true);
    clone.disabled = true;
    delete clone.dataset.nextReady;
    // Reattach click handler lost due to cloning
    clone.addEventListener("click", onNextButtonClick);
    nextBtn.replaceWith(clone);
  }
}

/**
 * Reset internal state for tests.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export function _resetForTest(store) {
  resetSkipState();
  resetSelection();
  battleEngine._resetForTest();
  stopScheduler();
  if (typeof window !== "undefined") {
    delete window.startRoundOverride;
  }
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  store.statTimeoutId = null;
  store.autoSelectId = null;
  store.selectionMade = false;
  cancelFrame(store.compareRaf);
  store.compareRaf = 0;
  const timerEl = document.getElementById("next-round-timer");
  if (timerEl) timerEl.textContent = "";
  scoreboard.clearMessage();
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
  resetGame();
  const quitBtn = document.getElementById("quit-match-button");
  if (quitBtn) {
    quitBtn.replaceWith(quitBtn.cloneNode(true));
  }
  if (store.quitModal) {
    store.quitModal.destroy();
    store.quitModal = null;
  }
  syncScoreDisplay();
  updateDebugPanel();
}
