import { disableNextRoundButton, showSelectionPrompt, updateDebugPanel } from "./uiHelpers.js";
import { resetStatButtons } from "../battle/index.js";
import { syncScoreDisplay } from "./uiService.js";
import { startTimer, handleStatSelectionTimeout, scheduleNextRound } from "./timerService.js";
import * as scoreboard from "../setupScoreboard.js";
import { handleStatSelection } from "./selectionHandler.js";
import { showMatchSummaryModal } from "./uiService.js";
import { handleReplay } from "./roundManager.js";
import { onBattleEvent, emitBattleEvent } from "./battleEvents.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Apply UI updates for a newly started round.
 *
 * @pseudocode
 * 1. Reset stat buttons and disable the Next Round button.
 * 2. Clear the round result display and sync the score.
 * 3. Update the round counter and show the selection prompt.
 * 4. Start the round timer and stall timeout.
 * 5. Update the debug panel.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {number} roundNumber - Current round number to display.
 * @param {number} [stallTimeoutMs=35000] - Delay before auto-select kicks in.
 */
export function applyRoundUI(store, roundNumber, stallTimeoutMs = 35000) {
  console.log("INFO: applyRoundUI called for round", roundNumber);
  resetStatButtons();
  disableNextRoundButton();
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
  syncScoreDisplay();
  scoreboard.updateRoundCounter(roundNumber);
  showSelectionPrompt();
  startTimer((stat, opts) => {
    const playerCard = document.getElementById("player-card");
    const opponentCard = document.getElementById("opponent-card");
    const playerVal = getCardStatValue(playerCard, stat);
    let opponentVal = getCardStatValue(opponentCard, stat);
    try {
      const opp = getOpponentJudoka();
      const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
      opponentVal = Number.isFinite(raw) ? raw : opponentVal;
    } catch {}
    return handleStatSelection(store, stat, { playerVal, opponentVal, ...opts });
  });
  store.stallTimeoutMs = stallTimeoutMs;
  store.statTimeoutId = setTimeout(
    () =>
      handleStatSelectionTimeout(store, (s, opts) => {
        const playerCard = document.getElementById("player-card");
        const opponentCard = document.getElementById("opponent-card");
        const playerVal = getCardStatValue(playerCard, s);
        let opponentVal = getCardStatValue(opponentCard, s);
        try {
          const opp = getOpponentJudoka();
          const raw = opp && opp.stats ? Number(opp.stats[s]) : NaN;
          opponentVal = Number.isFinite(raw) ? raw : opponentVal;
        } catch {}
        return handleStatSelection(store, s, { playerVal, opponentVal, ...opts });
      }),
    store.stallTimeoutMs
  );
  updateDebugPanel();
}

// --- Event bindings ---

onBattleEvent("roundStarted", (e) => {
  const { store, roundNumber } = e.detail || {};
  if (store && typeof roundNumber === "number") {
    applyRoundUI(store, roundNumber);
  }
});

onBattleEvent("statSelected", (e) => {
  console.log("INFO: statSelected event handler");
  const { stat } = e.detail || {};
  if (!stat) return;
  const btn = document.querySelector(`#stat-buttons button[data-stat="${stat}"]`);
  if (btn) {
    try {
      console.warn(
        `[test] addSelected: stat=${stat} label=${btn.textContent?.trim() || ""}`
      );
    } catch {}
    btn.classList.add("selected");
    showSnackbar(`You Picked: ${btn.textContent}`);
  }
  emitBattleEvent("statButtons:disable");
});

onBattleEvent("roundResolved", (e) => {
  const { store, result } = e.detail || {};
  if (!result) return;
  try {
    console.warn("[test] roundResolved event received");
  } catch {}
  syncScoreDisplay();
  scheduleNextRound(result);
  if (result.matchEnded) {
    scoreboard.clearRoundCounter();
    showMatchSummaryModal(result, async () => {
      await handleReplay(store);
    });
    emitBattleEvent("matchOver");
  }
  // Prefer immediate reset. In some headless/CI environments rAF can be
  // throttled heavily, which would delay clearing the visual selection
  // state and make tests flaky. We still attempt the two-rAF path to allow
  // one paint of the selected state in interactive sessions, but back it up
  // with a timeout-based fallback to guarantee timely clearing.
  try {
    requestAnimationFrame(() => requestAnimationFrame(() => resetStatButtons()));
  } catch {
    // If rAF is unavailable, clear immediately.
    resetStatButtons();
  }
  // Fallback: ensure reset occurs even if rAF is throttled/not firing.
  try {
    setTimeout(() => {
      try {
        resetStatButtons();
      } catch {}
    }, 120);
  } catch {}
  updateDebugPanel();
});
