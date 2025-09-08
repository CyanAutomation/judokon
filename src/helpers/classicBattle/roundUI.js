import { updateDebugPanel } from "./debugPanel.js";
import { showSelectionPrompt } from "./snackbar.js";
// Use index re-exports so tests can vi.mock("../battle/index.js") and spy
import { resetStatButtons } from "../battle/index.js";
import { startTimer } from "./timerService.js";
import { handleStatSelectionTimeout } from "./autoSelectHandlers.js";

import * as scoreboard from "../setupScoreboard.js";
import { handleStatSelection } from "./selectionHandler.js";
import { handleReplay, isOrchestrated } from "./roundManager.js";
import { onBattleEvent, emitBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { showSnackbar, updateSnackbar } from "../showSnackbar.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { syncScoreDisplay } from "./uiHelpers.js";
import { runWhenIdle } from "./idleCallback.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;
let showMatchSummaryModal = null;
function preloadUiService() {
  import("./uiService.js")
    .then((m) => {
      showMatchSummaryModal = m.showMatchSummaryModal;
    })
    .catch(() => {});
}
runWhenIdle(preloadUiService);

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
  try {
    syncScoreDisplay();
  } catch {}
  scoreboard.updateRoundCounter(roundNumber);
  showSelectionPrompt();
  const playerCard =
    store.playerCardEl || (store.playerCardEl = document.getElementById("player-card"));
  const opponentCard =
    store.opponentCardEl || (store.opponentCardEl = document.getElementById("opponent-card"));
  if (!store.statButtonEls) {
    store.statButtonEls = Array.from(
      document.querySelectorAll("#stat-buttons button[data-stat]")
    ).reduce((acc, btn) => {
      const s = btn.dataset.stat;
      if (s) acc[s] = btn;
      return acc;
    }, {});
  }
  startTimer((stat, opts) => {
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
 * Bind handler for `roundStarted` events.
 *
 * @pseudocode
 * 1. Listen for `roundStarted`.
 * 2. Extract store and round number.
 * 3. Invoke `applyRoundUI`.
 */
export function bindRoundStarted() {
  onBattleEvent("roundStarted", (e) => {
    const { store, roundNumber } = e.detail || {};
    if (store && typeof roundNumber === "number") {
      applyRoundUI(store, roundNumber);
    }
  });
}

/**
 * Bind handler for `statSelected` events.
 *
 * @pseudocode
 * 1. Listen for `statSelected`.
 * 2. Highlight the chosen button and optionally show feedback.
 * 3. Disable further stat selections.
 */
export function bindStatSelected() {
  onBattleEvent("statSelected", (e) => {
    try {
      if (!IS_VITEST) console.log("INFO: statSelected event handler");
    } catch {}
    const { stat, store, opts } = e.detail || {};
    if (!stat || !store || !store.statButtonEls) return;
    const btn = store.statButtonEls[stat];
    if (btn) {
      try {
        if (!IS_VITEST)
          console.warn(`[test] addSelected: stat=${stat} label=${(btn.textContent || "").trim()}`);
      } catch {}
      btn.classList.add("selected");
      if (!opts || !opts.delayOpponentMessage) {
        showSnackbar(`You Picked: ${btn.textContent}`);
      }
    }
    emitBattleEvent("statButtons:disable");
  });
}

/**
 * Bind handler for `roundResolved` events.
 *
 * @pseudocode
 * 1. Listen for `roundResolved`.
 * 2. Surface outcome, update score, maybe show summary.
 * 3. Clear selection highlight and refresh debug panel.
 */
export function bindRoundResolved() {
  onBattleEvent("roundResolved", (e) => {
    const { store, result } = e.detail || {};
    if (!result) return;
    try {
      if (!IS_VITEST) console.warn("[test] roundResolved event received");
    } catch {}
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
      try {
        showMatchSummaryModal?.(result, async () => {
          await handleReplay(store);
        });
      } catch {}
      emitBattleEvent("matchOver");
    } else {
      try {
        const secs = computeNextRoundCooldown();
        updateSnackbar(`Next round in: ${secs}s`);
        const orchestrated = (() => {
          try {
            return typeof isOrchestrated === "function" && isOrchestrated();
          } catch {
            return false;
          }
        })();
        if (!orchestrated) {
          if (secs >= 2) setTimeout(() => updateSnackbar(`Next round in: ${secs - 1}s`), 1000);
          if (secs >= 3) setTimeout(() => updateSnackbar(`Next round in: ${secs - 2}s`), 2000);
        }
      } catch {}
    }
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
    updateDebugPanel();
  });
}

/**
 * Bind all round UI event handlers.
 *
 * @pseudocode
 * 1. Bind `roundStarted` handler.
 * 2. Bind `statSelected` handler.
 * 3. Bind `roundResolved` handler.
 */
export function bindRoundUIEventHandlers() {
  bindRoundStarted();
  bindStatSelected();
  bindRoundResolved();
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
  // Preload modules so handlers avoid hot-path dynamic imports while still
  // honoring test-time mocks. These promises resolve once and are reused.
  // Silences early rejections to prevent unhandled warnings without
  // converting the promises to resolved placeholders.
  const silence = (p) => {
    p.catch(() => {});
    return p;
  };
  const scoreboardP = silence(import("../setupScoreboard.js"));
  const showSnackbarP = silence(import("../showSnackbar.js"));
  const computeNextRoundCooldownP = silence(import("../timers/computeNextRoundCooldown.js"));
  const roundManagerP = silence(import("./roundManager.js"));
  const uiHelpersP = silence(import("./uiHelpers.js"));
  onBattleEvent("roundStarted", (e) => {
    const { store, roundNumber } = e.detail || {};
    if (store && typeof roundNumber === "number") {
      applyRoundUI(store, roundNumber);
    }
  });
  onBattleEvent("statSelected", async (e) => {
    const { stat, store, opts } = e.detail || {};
    if (!stat || !store || !store.statButtonEls) return;
    const btn = store.statButtonEls[stat];
    if (btn) {
      try {
        if (!IS_VITEST)
          console.warn(`[test] addSelected: stat=${stat} label=${(btn.textContent || "").trim()}`);
      } catch {}
      btn.classList.add("selected");
      if (!opts || !opts.delayOpponentMessage) {
        try {
          const { showSnackbar } = await showSnackbarP;
          showSnackbar(`You Picked: ${btn.textContent}`);
        } catch {}
      }
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
      const scoreboard = await scoreboardP;
      // Always surface the outcome message
      scoreboard.showMessage(result.message || "", { outcome: true });
      // Update the score display using the resolved values to avoid
      // cross-module instance drift in tests. Fallback to full sync if needed.
      if (typeof scoreboard.updateScore === "function") {
        scoreboard.updateScore(result.playerScore, result.opponentScore);
      } else {
        try {
          syncScoreDisplay();
        } catch {}
      }
    } catch {}
    if (result.matchEnded) {
      try {
        const scoreboard = await scoreboardP;
        const roundManager = await roundManagerP;
        scoreboard.clearRoundCounter?.();
        try {
          await showMatchSummaryModal?.(result, async () => {
            if (typeof roundManager.handleReplay === "function") {
              await roundManager.handleReplay(store);
            }
          });
        } catch {}
        emitBattleEvent("matchOver");
      } catch {}
    } else {
      // Proactively surface the next-round countdown in the snackbar so tests
      // and users see it immediately after the outcome is shown.
      try {
        const [
          { computeNextRoundCooldown: cNRC },
          { updateSnackbar: uSb },
          { isOrchestrated: iO }
        ] = await Promise.all([computeNextRoundCooldownP, showSnackbarP, roundManagerP]);
        const secs = cNRC();
        uSb(`Next round in: ${secs}s`);
        const orchestrated = (() => {
          try {
            return typeof iO === "function" && iO();
          } catch {
            return false;
          }
        })();
        if (!orchestrated) {
          // Delay updates by 1s/2s to align with test expectations
          if (secs >= 2) setTimeout(() => uSb(`Next round in: ${secs - 1}s`), 1000);
          if (secs >= 3) setTimeout(() => uSb(`Next round in: ${secs - 2}s`), 2000);
        }
      } catch {}
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
      const { updateDebugPanel } = await uiHelpersP;
      updateDebugPanel();
    } catch {}
  });
}
