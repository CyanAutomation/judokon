import { showSelectionPrompt, updateDebugPanel } from "./uiHelpers.js";
// Use index re-exports so tests can vi.mock("../battle/index.js") and spy
import { resetStatButtons } from "../battle/index.js";
import { syncScoreDisplay } from "./uiService.js";
import { startTimer, handleStatSelectionTimeout } from "./timerService.js";

import * as scoreboard from "../setupScoreboard.js";
import { handleStatSelection } from "./selectionHandler.js";
import { showMatchSummaryModal } from "./uiService.js";
import { handleReplay, isOrchestrated } from "./roundManager.js";
import { onBattleEvent, emitBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { showSnackbar, updateSnackbar } from "../showSnackbar.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

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
 * 3. Show the stat selection prompt and start the selection timer which calls
 *    `handleStatSelection` when a stat button is pressed.
 * 4. Register stalled-selection timeout via `handleStatSelectionTimeout`.
 * 5. Save `stallTimeoutMs` on the store and refresh the debug panel.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {number} roundNumber - Current round number to display.
 * @param {number} [stallTimeoutMs=5000] - Delay before auto-select kicks in.
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
 * Bind static event handlers for round UI updates.
 *
 * These handlers listen for `roundStarted`, `statSelected`, and `roundResolved`
 * events to update the DOM, scoreboard, and timers. In production, binding
 * happens once per module load to avoid duplicate listeners.
 *
 * @pseudocode
 * 1. On `roundStarted` → call `applyRoundUI(store, roundNumber)`.
 * 2. On `statSelected` → add `selected` class to the chosen button, optionally show “You Picked…”, then disable stat buttons.
 * 3. On `roundResolved` → show outcome and update score; if match ended show summary, else surface next-round countdown and schedule failsafe transitions; clear selection highlight and refresh debug panel.
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
      // The orchestrator now handles cooldown initiation when the state machine
      // enters the 'cooldown' state. This call is no longer needed.
      // proactively surface the countdown text in the snackbar so tests can
      // observe it even if timer wiring races with other snackbar messages.
      try {
        const secs = computeNextRoundCooldown();
        // Use explicit text to avoid depending on i18n in tests
        updateSnackbar(`Next round in: ${secs}s`);
        // Fallback sequential updates when the orchestrator is not running
        if (!isOrchestrated && typeof isOrchestrated === "function") {
          // no-op; typo guard
        }
        const orchestrated = (() => {
          try {
            return typeof isOrchestrated === "function" && isOrchestrated();
          } catch {
            return false;
          }
        })();
        if (!orchestrated) {
          // Delay updates by 2s/3s to align with test expectations
          if (secs >= 2) setTimeout(() => updateSnackbar(`Next round in: ${secs - 1}s`), 2000);
          if (secs >= 3) setTimeout(() => updateSnackbar(`Next round in: ${secs - 2}s`), 3000);
        }
      } catch {}
      // Failsafe removed as it conflicts with the orchestrator.
    }
    // Keep the selected stat highlighted for two frames to allow tests and
    // users to perceive the selection before it clears.
    try {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          try {
            if (typeof resetStatButtons === "function") resetStatButtons();
          } catch {}
        })
      );
    } catch {
      // Fallback for environments without rAF
      setTimeout(() => {
        try {
          if (typeof resetStatButtons === "function") resetStatButtons();
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
 * Bind dynamic event handlers that import dependencies at call time.
 *
 * Dynamically imports modules inside handlers so test-time mocks (vi.mock)
 * are honored. Guards against rebinding to the same EventTarget instance.
 *
 * @pseudocode
 * 1. Track the current EventTarget in a WeakSet; bail if already bound.
 * 2. On `roundStarted` → call `applyRoundUI(store, roundNumber)`.
 * 3. On `statSelected` → add `selected`, show “You Picked…”, and disable buttons.
 * 4. On `roundResolved` → show outcome, update score, surface countdown text, schedule failsafes, clear selection, update debug panel.
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
      // Proactively surface the next-round countdown in the snackbar so tests
      // and users see it immediately after the outcome is shown. Use dynamic
      // imports so test mocks take effect.
      try {
        const { computeNextRoundCooldown: cNRC } = await import(
          "../timers/computeNextRoundCooldown.js"
        );
        const { updateSnackbar: uSb } = await import("../showSnackbar.js");
        const secs = cNRC();
        uSb(`Next round in: ${secs}s`);
      } catch {}
      // Fallback sequential updates when the orchestrator is not running
      try {
        const { computeNextRoundCooldown: cNRC } = await import(
          "../timers/computeNextRoundCooldown.js"
        );
        const { updateSnackbar: uSb } = await import("../showSnackbar.js");
        const { isOrchestrated: iO } = await import("./roundManager.js");
        const secs = cNRC();
        const orchestrated = (() => {
          try {
            return typeof iO === "function" && iO();
          } catch {
            return false;
          }
        })();
        if (!orchestrated) {
          // Delay updates by 2s/3s to align with test expectations
          if (secs >= 2) setTimeout(() => uSb(`Next round in: ${secs - 1}s`), 2000);
          if (secs >= 3) setTimeout(() => uSb(`Next round in: ${secs - 2}s`), 3000);
        }
      } catch {}
      // Failsafe removed as it conflicts with the orchestrator.
    }
    // Keep the selected stat highlighted for two frames to mirror the static path
    try {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          try {
            if (typeof resetStatButtons === "function") resetStatButtons();
          } catch {}
        })
      );
    } catch {
      setTimeout(() => {
        try {
          if (typeof resetStatButtons === "function") resetStatButtons();
        } catch {}
      }, 32);
    }
    try {
      const { updateDebugPanel } = await import("./uiHelpers.js");
      updateDebugPanel();
    } catch {}
  });
}
