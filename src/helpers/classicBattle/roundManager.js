import { drawCards, _resetForTest as resetSelection } from "./cardSelection.js";
import { startTimer, handleStatSelectionTimeout } from "./timerService.js";
import { showSelectionPrompt, disableNextRoundButton, updateDebugPanel } from "./uiHelpers.js";
import { _resetForTest as resetEngineForTest } from "../BattleEngine.js";
import * as battleEngine from "../BattleEngine.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { resetStatButtons } from "../battle/index.js";
import { syncScoreDisplay } from "./uiService.js";
import { CLASSIC_BATTLE_MAX_ROUNDS } from "../constants.js";
import { handleStatSelection } from "./selectionHandler.js";
import { quitMatch } from "./quitModal.js";

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
  resetEngineForTest();
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
 * 4. Update the round counter using `battleEngine.getRoundsPlayed() + 1` and
 *    `CLASSIC_BATTLE_MAX_ROUNDS`.
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
  infoBar.updateRoundCounter(currentRound, CLASSIC_BATTLE_MAX_ROUNDS);
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
 * 3. Remove `data-next-ready` and add the `disabled` class on the clone.
 *
 * @returns {void}
 */
export function resetGame() {
  const nextBtn = document.getElementById("next-button");
  if (nextBtn) {
    const clone = nextBtn.cloneNode(true);
    clone.classList.add("disabled");
    delete clone.dataset.nextReady;
    nextBtn.replaceWith(clone);
  }
}

/**
 * Reset internal state for tests.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export function _resetForTest(store) {
  resetSelection();
  battleEngine._resetForTest();
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
  resetGame();
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
