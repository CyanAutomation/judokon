import { showSelectionPrompt, updateDebugPanel } from "./uiHelpers.js";
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
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

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
  try {
    if (!IS_VITEST) console.log("INFO: applyRoundUI called for round", roundNumber);
  } catch {}
  resetStatButtons();
  // Do not force-disable the Next button here; it should remain
  // ready after cooldown so tests and users can advance immediately.
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

export function bindRoundUIEventHandlers() {
  onBattleEvent("roundStarted", (e) => {
    const { store, roundNumber } = e.detail || {};
    if (store && typeof roundNumber === "number") {
      applyRoundUI(store, roundNumber);
    }
  });

  onBattleEvent("statSelected", (e) => {
    try {
      if (!IS_VITEST) console.log("INFO: statSelected event handler");
    } catch {}
    const { stat } = e.detail || {};
    if (!stat) return;
    const btn = document.querySelector(`#stat-buttons button[data-stat="${stat}"]`);
    if (btn) {
      try {
        if (!IS_VITEST)
          console.warn(`[test] addSelected: stat=${stat} label=${btn.textContent?.trim() || ""}`);
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
      if (!IS_VITEST) console.warn("[test] roundResolved event received");
    } catch {}
    // Update the round message with the resolved outcome to keep #round-message
    // in sync even when uiService is mocked in unit tests.
    try {
      scoreboard.showMessage(result.message || "");
    } catch {}
    syncScoreDisplay();
    if (result.matchEnded) {
      scoreboard.clearRoundCounter();
      showMatchSummaryModal(result, async () => {
        await handleReplay(store);
      });
      emitBattleEvent("matchOver");
    } else {
      // Start the next-round cooldown immediately. The scheduler internally
      // validates live state before dispatching 'ready', so scheduling here is
      // safe and ensures the snackbar countdown appears without waiting for a
      // separate state change event that may be mocked out in tests.
      scheduleNextRound(result);
    }
    // Keep the selected stat highlighted for two frames to allow tests and
    // users to perceive the selection before it clears.
    try {
      requestAnimationFrame(() => requestAnimationFrame(() => resetStatButtons()));
    } catch {
      // Fallback for environments without rAF
      setTimeout(() => {
        try {
          resetStatButtons();
        } catch {}
      }, 32);
    }
    updateDebugPanel();
  });
}

// Bind once on module load for production/runtime usage.
bindRoundUIEventHandlers();

// Test-friendly variant: dynamically import dependencies within handlers so
// that vi.mock replacements are honored even when bindings occur before mocks.
export function bindRoundUIEventHandlersDynamic() {
  onBattleEvent("roundStarted", (e) => {
    const { store, roundNumber } = e.detail || {};
    if (store && typeof roundNumber === "number") {
      applyRoundUI(store, roundNumber);
    }
  });
  onBattleEvent("statSelected", async (e) => {
    const { stat } = e.detail || {};
    if (!stat) return;
    const btn = document.querySelector(`#stat-buttons button[data-stat="${stat}"]`);
    if (btn) {
      try {
        if (!IS_VITEST)
          console.warn(`[test] addSelected: stat=${stat} label=${btn.textContent?.trim() || ""}`);
      } catch {}
      btn.classList.add("selected");
      try {
        const snackbar = await import("../showSnackbar.js");
        snackbar.showSnackbar(`You Picked: ${btn.textContent}`);
      } catch {}
    }
    emitBattleEvent("statButtons:disable");
  });
  onBattleEvent("roundResolved", async (e) => {
    const { store, result } = e.detail || {};
    if (!result) return;
    try {
      if (!IS_VITEST) console.warn("[test] roundResolved event received (dynamic)");
    } catch {}
    try {
      const scoreboard = await import("../setupScoreboard.js");
      scoreboard.showMessage(result.message || "");
      scoreboard.syncScoreDisplay?.();
    } catch {}
    if (result.matchEnded) {
      try {
        const scoreboard = await import("../setupScoreboard.js");
        const { showMatchSummaryModal } = await import("./uiService.js");
        scoreboard.clearRoundCounter?.();
        await showMatchSummaryModal(result, async () => {
          await handleReplay(store);
        });
        emitBattleEvent("matchOver");
      } catch {}
    } else {
      const { scheduleNextRound } = await import("./timerService.js");
      // Schedule immediately to surface the countdown in tests and runtime.
      scheduleNextRound(result);
    }
    resetStatButtons();
    try {
      const { updateDebugPanel } = await import("./uiHelpers.js");
      updateDebugPanel();
    } catch {}
  });
}
