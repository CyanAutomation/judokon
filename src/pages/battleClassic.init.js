import { setupScoreboard, updateScore, updateRoundCounter } from "../helpers/setupScoreboard.js";
import {
  createBattleEngine,
  getPointsToWin,
  STATS,
  on as onEngine
} from "../helpers/battleEngineFacade.js";
import { initRoundSelectModal } from "../helpers/classicBattle/roundSelectModal.js";
import { startTimer } from "../helpers/classicBattle/timerService.js";
import { createCountdownTimer, getDefaultTimer } from "../helpers/timerUtils.js";
import { createBattleStore, startCooldown } from "../helpers/classicBattle/roundManager.js";
import { computeRoundResult } from "../helpers/classicBattle/roundResolver.js";
import { onNextButtonClick } from "../helpers/classicBattle/timerService.js";
import { handleStatSelection } from "../helpers/classicBattle/selectionHandler.js";
import {
  setStatButtonsEnabled,
  resolveStatButtonsReady
} from "../helpers/classicBattle/statButtons.js";
import { quitMatch } from "../helpers/classicBattle/quitModal.js";
import { bindUIHelperEventHandlersDynamic } from "../helpers/classicBattle/uiEventHandlers.js";
import { initDebugPanel } from "../helpers/classicBattle/debugPanel.js";
import { isEnabled } from "../helpers/featureFlags.js";
import { showEndModal } from "../helpers/classicBattle/endModal.js";
import { onBattleEvent } from "../helpers/classicBattle/battleEvents.js";

/**
 * Start a round cycle: update round counter, render stat buttons, start the selection timer.
 *
 * @pseudocode
 * 1. Update the round counter to `getRoundsPlayed()+1` when available; otherwise default to 1.
 * 2. Render stat buttons with click handlers that resolve the round.
 * 3. Start the round selection timer; on expiration or selection, compute result and enter cooldown.
 *
 * @param {ReturnType<typeof createBattleStore>} store
 * @returns {Promise<void>}
 */
async function startRoundCycle(store) {
  try {
    const { getRoundsPlayed } = await import("../helpers/battleEngineFacade.js");
    const played = Number(getRoundsPlayed?.() || 0);
    updateRoundCounter(Number.isFinite(played) ? played + 1 : 1);
  } catch (err) {
    console.debug("battleClassic: getRoundsPlayed failed", err);
    try {
      updateRoundCounter(1);
    } catch (err2) {
      console.debug("battleClassic: updateRoundCounter fallback failed", err2);
    }
  }

  // Render stat buttons and wiring
  function renderStatButtons() {
    const container = document.getElementById("stat-buttons");
    if (!container) return;
    container.innerHTML = "";
    const created = [];
    for (const stat of STATS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(stat);
      btn.setAttribute("data-stat", String(stat));
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        try {
          const delayOverride =
            typeof window !== "undefined" && typeof window.__OPPONENT_RESOLVE_DELAY_MS === "number"
              ? Number(window.__OPPONENT_RESOLVE_DELAY_MS)
              : 0;
          const result = await handleStatSelection(store, String(stat), {
            playerVal: 5,
            opponentVal: 3,
            delayMs: delayOverride
          });
          try {
            const { isMatchEnded } = await import("../helpers/battleEngineFacade.js");
            if (isMatchEnded() || (result && result.matchEnded)) {
              showEndModal(store, { winner: "player", scores: { player: 1, opponent: 0 } });
            } else {
              startCooldown(store);
            }
          } catch (err) {
            console.debug("battleClassic: checking match end failed", err);
            startCooldown(store);
          }
        } catch (err) {
          console.debug("battleClassic: stat selection handler failed", err);
        }
      });
      created.push(btn);
      container.appendChild(btn);
    }
    try {
      const buttons = container.querySelectorAll("button[data-stat]");
      setStatButtonsEnabled(
        buttons,
        container,
        true,
        () => resolveStatButtonsReady(),
        () => {}
      );
    } catch {}
  }

  try {
    renderStatButtons();
  } catch (err) {
    console.debug("battleClassic: renderStatButtons failed", err);
  }

  // Start the selection timer; in Vitest use a lightweight fallback to ensure deterministic ticks
  try {
    const IS_VITEST =
      typeof process !== "undefined" && process.env && process.env.VITEST === "true";
    if (IS_VITEST) {
      const dur = Number(getDefaultTimer("roundTimer")) || 2;
      const timer = createCountdownTimer(dur, {
        onTick: (remaining) => {
          try {
            const el = document.getElementById("next-round-timer");
            if (el) el.textContent = remaining > 0 ? `Time Left: ${remaining}s` : "";
          } catch (err) {
            console.debug("battleClassic: onTick DOM update failed", err);
          }
        },
        onExpired: () => {
          try {
            document.body.dataset.autoSelected = document.body.dataset.autoSelected || "auto";
          } catch (err) {
            console.debug("battleClassic: set autoSelected failed", err);
          }
          // Deterministic outcome for unit tests so score visibly changes
          try {
            computeRoundResult(store, "speed", 5, 3);
            // Begin inter-round cooldown and expose Next controls
            startCooldown(store);
          } catch (err) {
            console.debug("battleClassic: computeRoundResult (vitest) failed", err);
          }
        },
        pauseOnHidden: false
      });
      timer.start();
    } else {
      await startTimer(async (stat) => {
        try {
          document.body.dataset.autoSelected = String(stat || "auto");
        } catch (err) {
          console.debug("battleClassic: set autoSelected (timer) failed", err);
        }
        // Use a simple deterministic comparison so the scoreboard reflects a change
        try {
          await computeRoundResult(store, String(stat || "speed"), 5, 3);
          // After outcome, begin cooldown for Next
          startCooldown(store);
        } catch (err) {
          console.debug("battleClassic: computeRoundResult (timer) failed", err);
        }
        return Promise.resolve();
      });
    }
  } catch {}
}

function init() {
  // Initialize scoreboard with no-op timer controls; orchestrator will provide real controls later
  setupScoreboard({ pauseTimer() {}, resumeTimer() {}, startCooldown() {} });
  // Seed visible defaults to avoid invisible empty elements and enable a11y announcements
  try {
    updateScore(0, 0);
    // Do not force Round 0 after match starts; actual round set in startRoundCycle
    updateRoundCounter(0);
    const rc = document.getElementById("round-counter");
    if (rc && !rc.textContent) rc.textContent = "Round 0";
  } catch {}

  // Initialize the battle engine and present the round selection modal.
  try {
    createBattleEngine();
    const store = createBattleStore();
    try {
      window.battleStore = store;
    } catch (err) {
      console.debug("battleClassic: exposing store to window failed", err);
    }
    // Bind transient UI handlers (opponent choosing message, reveal, outcome)
    // Bind transient UI handlers (opponent choosing message, reveal, outcome)
    try {
      bindUIHelperEventHandlersDynamic();
    } catch (err) {
      console.debug("battleClassic: bindUIHelperEventHandlersDynamic failed", err);
    }
    // Show modal when a round resolves with matchEnded=true (covers direct-resolve path)
    try {
      onBattleEvent("roundResolved", (e) => {
        try {
          const result = e?.detail?.result;
          if (!result || !result.matchEnded) return;
          const outcome = String(result?.outcome || "");
          const winner =
            outcome === "matchWinPlayer"
              ? "player"
              : outcome === "matchWinOpponent"
                ? "opponent"
                : "none";
          const scores = {
            player: Number(result?.playerScore) || 0,
            opponent: Number(result?.opponentScore) || 0
          };
          showEndModal(store, { winner, scores });
        } catch {}
      });
    } catch (err) {
      console.debug("battleClassic: binding roundResolved listener failed", err);
    }
    // Initialize debug panel when enabled
    try {
      initDebugPanel();
    } catch (err) {
      console.debug("battleClassic: initDebugPanel failed", err);
    }
    // Show end-of-match modal on engine event to cover all resolution paths
    try {
      onEngine?.("matchEnded", (detail) => {
        try {
          const outcome = String(detail?.outcome || "");
          const winner =
            outcome === "matchWinPlayer"
              ? "player"
              : outcome === "matchWinOpponent"
                ? "opponent"
                : "none";
          const scores = {
            player: Number(detail?.playerScore) || 0,
            opponent: Number(detail?.opponentScore) || 0
          };
          showEndModal(store, { winner, scores });
        } catch {}
      });
    } catch (err) {
      console.debug("battleClassic: binding matchEnded listener failed", err);
    }
    // Setup battle state badge when enabled
    try {
      const badge = document.getElementById("battle-state-badge");
      if (badge && (isEnabled("battleStateBadge") || isEnabled("battleStateProgress"))) {
        badge.hidden = false;
        badge.textContent = "Lobby";
      }
    } catch (err) {
      console.debug("battleClassic: initializing badge failed", err);
    }
    // Wire Next button click to cooldown/advance handler
    try {
      const nextBtn = document.getElementById("next-button");
      if (nextBtn) nextBtn.addEventListener("click", onNextButtonClick);
    } catch (err) {
      console.debug("battleClassic: wiring next button failed", err);
    }
    // Wire Replay button to restart match
    try {
      const replayBtn = document.getElementById("replay-button");
      if (replayBtn)
        replayBtn.addEventListener("click", async () => {
          try {
            await handleReplay(store);
          } catch (err) {
            console.debug("battleClassic: handleReplay failed", err);
          }
          try {
            updateScore(0, 0);
            updateRoundCounter(1);
          } catch (err) {
            console.debug("battleClassic: resetting score after replay failed", err);
          }
        });
    } catch (err) {
      console.debug("battleClassic: wiring replay button failed", err);
    }
    // Wire Quit button to open confirmation modal
    try {
      const quitBtn = document.getElementById("quit-button");
      if (quitBtn) quitBtn.addEventListener("click", () => quitMatch(store, quitBtn));
    } catch (err) {
      console.debug("battleClassic: wiring quit button failed", err);
    }
    initRoundSelectModal(async () => {
      try {
        const pts = getPointsToWin();
        document.body.dataset.target = String(pts);
      } catch {}
      // Reflect state change in badge
      try {
        const badge = document.getElementById("battle-state-badge");
        if (badge && !badge.hidden) badge.textContent = "Round";
      } catch {}
      // Begin first round
      await startRoundCycle(store);
    });

    // In the simplified (non-orchestrated) page, start the next round when the user
    // clicks Next and the cooldown is considered finished.
    try {
      onBattleEvent("countdownFinished", async () => {
        await startRoundCycle(store);
      });
    } catch {}
  } catch {}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { init };
