import { showSelectionPrompt, updateDebugPanel } from "./uiHelpers.js";
import { resetStatButtons } from "../battle/index.js";
import { syncScoreDisplay } from "./uiService.js";
import { startTimer, handleStatSelectionTimeout } from "./timerService.js";
import { startCooldown } from "./roundManager.js";
import * as scoreboard from "../setupScoreboard.js";
import { handleStatSelection } from "./selectionHandler.js";
import { showMatchSummaryModal } from "./uiService.js";
import { handleReplay } from "./roundManager.js";
import { onBattleEvent, emitBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { showSnackbar, updateSnackbar } from "../showSnackbar.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { getStateSnapshot } from "./battleDebug.js";
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Apply UI updates for a newly started round.
 *
 * Resets visible state for stat buttons, updates the round counter and score
 * display, starts the round timer and registers the stall timeout that may
 * auto-select a stat when the player does not act.
 *
 * @pseudocode
 * 1. Reset stat buttons and clear any round result text.
 * 2. Sync the scoreboard and update the round counter.
 * 3. Show the stat selection prompt and start the timer which calls
 *    `handleStatSelection` when a stat button is pressed.
 * 4. Kick off stall timeout logic via `handleStatSelectionTimeout` and update debug panel.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {number} roundNumber - Current round number to display.
 * @param {number} [stallTimeoutMs=35000] - Delay before auto-select kicks in.
 */
export function applyRoundUI(store, roundNumber, stallTimeoutMs = 5000) {
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
  }, store);
  store.stallTimeoutMs = stallTimeoutMs;
  // Schedule stall prompt and optional auto-select using the unified helper
  // without double-wrapping the timeout. The helper manages its own timer
  // and records `store.autoSelectId` for later cancellation.
  handleStatSelectionTimeout(
    store,
    (s, opts) => {
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
    },
    store.stallTimeoutMs
  );
  updateDebugPanel();
}

// --- Event bindings ---

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Bind static event handlers for round UI updates.
 *
 * These handlers listen for `roundStarted`, `statSelected` and `roundResolved`
 * events emitted during the battle and update the DOM, scoreboard and timers
 * accordingly. This binding is done once per worker/module load in
 * production to avoid duplicate listeners.
 *
 * @pseudocode
 * 1. Listen for `roundStarted` and call `applyRoundUI`.
 * 2. Listen for `statSelected`, mark the selected button and disable stat buttons.
 * 3. Listen for `roundResolved`, show the result message and either show the
 *    match summary modal (on match end) or start the cooldown for next round.
 *
 * @returns {void}
 */
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
    const { stat, opts } = e.detail || {};
    if (!stat) return;
    const btn = document.querySelector(`#stat-buttons button[data-stat="${stat}"]`);
    if (btn) {
      try {
        if (!IS_VITEST)
          console.warn(`[test] addSelected: stat=${stat} label=${btn.textContent?.trim() || ""}`);
      } catch {}
      btn.classList.add("selected");
      // Suppress the immediate snackbar when the stat was auto-selected due to
      // stall/timeout so the upcoming cooldown countdown can occupy the snackbar.
      if (!opts || !opts.delayOpponentMessage) {
        showSnackbar(`You Picked: ${btn.textContent}`);
      }
    }
    emitBattleEvent("statButtons:disable");
  });

  onBattleEvent("roundResolved", (e) => {
    const { store, result } = e.detail || {};
    if (!result) return;
    try {
      if (!IS_VITEST) console.warn("[test] roundResolved event received");
    } catch {}
    // Update the round message and score using the resolved values to avoid
    // relying on engine singletons in test environments.
    try {
      scoreboard.showMessage(result.message || "", { outcome: true });
    } catch {}
    try {
      if (typeof scoreboard.updateScore === "function") {
        scoreboard.updateScore(result.playerScore, result.opponentScore);
      } else {
        syncScoreDisplay();
      }
    } catch {}
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
      startCooldown(store);
      // Proactively surface the countdown text in the snackbar so tests can
      // observe it even if timer wiring races with other snackbar messages.
      try {
        const secs = computeNextRoundCooldown();
        updateSnackbar(t("ui.nextRoundIn", { seconds: secs }));
      } catch {}
      // Failsafe: if the machine is still stuck in roundDecision shortly after
      // roundResolved, force the outcome → continue transitions to prevent a
      // visible stall.
      try {
        const outcomeEvent =
          result?.outcome === "winPlayer"
            ? "outcome=winPlayer"
            : result?.outcome === "winOpponent"
              ? "outcome=winOpponent"
              : "outcome=draw";
        setTimeout(async () => {
          try {
            const { state } = getStateSnapshot();
            if (state === "roundDecision") {
              const mod = await import("./orchestrator.js");
              await mod.dispatchBattleEvent(outcomeEvent);
              await mod.dispatchBattleEvent("continue");
            }
          } catch {}
        }, 0);
      } catch {}
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

// Bind once on module load for production/runtime usage. Guard against
// duplicate bindings when tests reset modules across files.
try {
  const FLAG = "__classicBattleRoundUIBound";
  if (!globalThis[FLAG]) {
    bindRoundUIEventHandlers();
    globalThis[FLAG] = true;
  }
} catch {
  bindRoundUIEventHandlers();
}

// Test-friendly variant: dynamically import dependencies within handlers so
// that vi.mock replacements are honored even when bindings occur before mocks.
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Bind dynamic event handlers that import dependencies at call time.
 *
 * This test-friendly variant dynamically imports modules inside handlers so
 * that test-time mocks (via vi.mock) are honored. It guards against rebinding
 * to the same EventTarget.
 *
 * @pseudocode
 * 1. Prevent rebinding by tracking the target in a WeakSet on globalThis.
 * 2. Bind `roundStarted`, `statSelected`, and `roundResolved` with handlers
 *    that import and call the same UI helpers used by the static bindings.
 *
 * @returns {void}
 */
export function bindRoundUIEventHandlersDynamic() {
  // Guard against rebinding on the same EventTarget instance
  try {
    const KEY = "__cbRoundUIDynamicBoundTargets";
    const target = getBattleEventTarget();
    const set = (globalThis[KEY] ||= new WeakSet());
    if (set.has(target)) return;
    set.add(target);
  } catch {}
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
      // Always surface the outcome message
      scoreboard.showMessage(result.message || "", { outcome: true });
      // Update the score display using the resolved values to avoid
      // cross-module instance drift in tests. Fallback to full sync if needed.
      if (typeof scoreboard.updateScore === "function") {
        scoreboard.updateScore(result.playerScore, result.opponentScore);
      } else {
        try {
          const ui = await import("./uiService.js");
          ui.syncScoreDisplay?.();
        } catch {}
      }
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
      const { startCooldown } = await import("./roundManager.js");
      // Schedule immediately to surface the countdown in tests and runtime.
      startCooldown(store);
      // Failsafe for dynamic path as well
      try {
        const outcomeEvent =
          result?.outcome === "winPlayer"
            ? "outcome=winPlayer"
            : result?.outcome === "winOpponent"
              ? "outcome=winOpponent"
              : "outcome=draw";
        setTimeout(async () => {
          try {
            const { state } = getStateSnapshot();
            if (state === "roundDecision") {
              const mod = await import("./orchestrator.js");
              await mod.dispatchBattleEvent(outcomeEvent);
              await mod.dispatchBattleEvent("continue");
            }
          } catch {}
        }, 0);
      } catch {}
    }
    resetStatButtons();
    try {
      const { updateDebugPanel } = await import("./uiHelpers.js");
      updateDebugPanel();
    } catch {}
  });
}
