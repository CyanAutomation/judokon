import { STATS, stopTimer } from "../battleEngineFacade.js";
import { chooseOpponentStat, evaluateRound as evaluateRoundApi } from "../api/battleUI.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { getStatValue, resetStatButtons } from "../battle/index.js";
import {
  revealOpponentCard,
  updateDebugPanel,
  showStatComparison,
  showRoundOutcome
} from "./uiHelpers.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { scheduleNextRound } from "./timerService.js";
import { showMatchSummaryModal, syncScoreDisplay } from "./uiService.js";
import { handleReplay } from "./roundManager.js";

// Local dispatcher to avoid circular import with orchestrator.
// Uses a window-exposed getter set by the orchestrator at runtime.
async function dispatchBattleEvent(eventName, payload) {
  const record = (via, ok) => {
    try {
      if (typeof window !== "undefined") {
        const log = Array.isArray(window.__eventDebug) ? window.__eventDebug : [];
        log.push({ event: eventName, via, ok, ts: Date.now() });
        while (log.length > 50) log.shift();
        window.__eventDebug = log;
      }
    } catch {}
  };
  // Primary path: dispatch via the live machine exposed by the orchestrator.
  try {
    if (typeof window !== "undefined") {
      const getMachine = window.__getClassicBattleMachine;
      const machine = typeof getMachine === "function" ? getMachine() : null;
      if (machine && typeof machine.dispatch === "function") {
        const res = await machine.dispatch(eventName, payload);
        record("machine", true);
        return res;
      }
    }
  } catch {}
  // Fallback for tests or non-orchestrated flows: call the exported
  // orchestrator function (mockable by Vitest) via dynamic import to
  // avoid a static cycle in production bundles.
  try {
    // Only attempt this in browser-like environments where window exists.
    // In Node test environments (no window), importing the real orchestrator
    // can hang due to DOM/state machine setup.
    if (typeof window === "undefined") return;
    const orchestrator = await import("./orchestrator.js");
    if (orchestrator && typeof orchestrator.dispatchBattleEvent === "function") {
      if (payload === undefined) {
        const res = await orchestrator.dispatchBattleEvent(eventName);
        record("orchestratorImport", true);
        return res;
      }
      const res = await orchestrator.dispatchBattleEvent(eventName, payload);
      record("orchestratorImport", true);
      return res;
    }
  } catch {}
  record("none", false);
}

/**
 * Determine the opponent's stat choice based on difficulty.
 *
 * @pseudocode
 * 1. Retrieve the opponent judoka via `getOpponentJudoka`.
 * 2. Build an array of `{stat, value}` pairs from its stats.
 * 3. Pass the array to `chooseOpponentStat` with the provided difficulty.
 * 4. Return the chosen stat key.
 *
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] Difficulty setting.
 * @returns {string} One of the values from `STATS`.
 */
export function simulateOpponentStat(difficulty = "easy") {
  const opp = getOpponentJudoka();
  let values = [];
  if (opp && opp.stats) {
    values = STATS.map((stat) => ({ stat, value: Number(opp.stats[stat]) || 0 }));
  } else {
    const card = document.getElementById("opponent-card");
    values = card ? STATS.map((stat) => ({ stat, value: getStatValue(card, stat) })) : [];
  }
  return chooseOpponentStat(values, difficulty);
}

/**
 * Evaluate round data without side effects.
 *
 * @pseudocode
 * 1. Call `evaluateRoundApi` with the provided values.
 * 2. Determine outcome by comparing `playerVal` and `opponentVal`.
 * 3. Return the API result augmented with outcome and the input values.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{message: string, matchEnded: boolean, playerScore: number, opponentScore: number, outcome: string, playerVal: number, opponentVal: number}}
 */
export function evaluateRoundData(playerVal, opponentVal) {
  const base = evaluateRoundApi(playerVal, opponentVal);
  const outcome =
    playerVal > opponentVal ? "winPlayer" : playerVal < opponentVal ? "winOpponent" : "draw";
  return { ...base, outcome, playerVal, opponentVal };
}

/**
 * Evaluate a selected stat and update the UI.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @returns {{message?: string, matchEnded: boolean}}
 */
export function evaluateRound(store, stat) {
  const playerCard = document.getElementById("player-card");
  const opponentCard = document.getElementById("opponent-card");
  const playerVal = getStatValue(playerCard, stat);
  let opponentVal = 0;
  try {
    const opp = getOpponentJudoka();
    const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
    opponentVal = Number.isFinite(raw) ? raw : getStatValue(opponentCard, stat);
  } catch {
    opponentVal = getStatValue(opponentCard, stat);
  }
  const result = evaluateRoundData(playerVal, opponentVal);
  syncScoreDisplay();
  if (typeof showRoundOutcome === "function") {
    showRoundOutcome(result.message || "");
  }
  if (typeof showStatComparison === "function") {
    showStatComparison(store, stat, playerVal, opponentVal);
  }
  updateDebugPanel();
  return result;
}

/**
 * Handles the player's stat selection.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 */
export async function handleStatSelection(store, stat) {
  if (store.selectionMade) {
    return;
  }
  store.selectionMade = true;
  store.playerChoice = stat;
  stopTimer();
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  scoreboard.clearTimer();
  // In test environments, resolve synchronously to avoid orchestrator coupling
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      await resolveRound(store);
      return;
    }
  } catch {}
  // If the orchestrator is active, signal selection; otherwise resolve inline
  // to keep tests and non-orchestrated flows moving.
  try {
    const hasMachine = typeof window !== "undefined" && !!window.__classicBattleState;
    if (hasMachine) {
      await dispatchBattleEvent("statSelected");
      // Failsafe: if the orchestrator onEnter(roundDecision) does not resolve
      // the round promptly, kick off a local resolution after a short delay.
      try {
        setTimeout(() => {
          // Only run if still awaiting resolution and selection remains.
          try {
            if (
              typeof window !== "undefined" &&
              window.__classicBattleState === "roundDecision" &&
              store.playerChoice
            ) {
              resolveRound(store).catch(() => {});
            }
          } catch {}
        }, 600);
      } catch {}
    } else {
      await resolveRound(store);
    }
  } catch {
    await resolveRound(store);
  }
}

/**
 * Resolves the round after a stat has been selected.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export async function resolveRound(store) {
  const stat = store.playerChoice;
  if (!stat) {
    return;
  }
  // Record round debug info
  try {
    if (typeof window !== "undefined") {
      window.__roundDebug = { playerChoice: stat, startedAt: Date.now() };
    }
  } catch {}
  updateDebugPanel();
  // Show delayed opponent-choosing hint, then announce evaluation to the orchestrator.
  const opponentSnackbarId = setTimeout(() => showSnackbar("Opponent is choosing…"), 500);
  // Announce evaluation to the orchestrator for observability/tests.
  await dispatchBattleEvent("evaluate");
  try {
    if (typeof window !== "undefined") {
      const rd = window.__roundDebug || {};
      rd.evaluateAt = Date.now();
      window.__roundDebug = rd;
    }
  } catch {}
  updateDebugPanel();

  // Introduce a small, natural delay to simulate opponent thinking.
  const delay = 300 + Math.floor(Math.random() * 401);
  await new Promise((resolve) => setTimeout(resolve, delay));
  // Proceed; run opponent reveal asynchronously to avoid any UI stall.
  clearTimeout(opponentSnackbarId);
  try {
    if (typeof window !== "undefined") {
      const rd = window.__roundDebug || {};
      rd.reveal = "deferred";
      window.__roundDebug = rd;
    }
  } catch {}
  try {
    // Fire-and-forget opponent reveal. Errors are swallowed.
    Promise.resolve()
      .then(() => revealOpponentCard())
      .catch(() => {});
  } catch {}
  updateDebugPanel();
  let result;
  try {
    result = evaluateRound(store, stat);
  } catch (err) {
    try {
      if (typeof window !== "undefined") {
        const rd = window.__roundDebug || {};
        rd.error = String(err?.message || err);
        window.__roundDebug = rd;
      }
    } catch {}
    // Attempt to recover by interrupting the round
    await dispatchBattleEvent("interrupt");
    updateDebugPanel();
    return;
  }

  const outcomeEvent =
    result.outcome === "winPlayer"
      ? "outcome=winPlayer"
      : result.outcome === "winOpponent"
        ? "outcome=winOpponent"
        : "outcome=draw";

  try {
    if (typeof window !== "undefined") {
      const rd = window.__roundDebug || {};
      rd.outcomeEvent = outcomeEvent;
      rd.resolvedAt = Date.now();
      window.__roundDebug = rd;
    }
  } catch {}
  await dispatchBattleEvent(outcomeEvent);
  updateDebugPanel();

  if (result.matchEnded) {
    scoreboard.clearRoundCounter();
    await dispatchBattleEvent("matchPointReached");
  } else {
    await dispatchBattleEvent("continue");
  }

  scheduleNextRound(result);

  if (result.matchEnded) {
    showMatchSummaryModal(result, async () => {
      await dispatchBattleEvent("finalize");
      await dispatchBattleEvent("rematch");
      await dispatchBattleEvent("startClicked");
      handleReplay(store);
    });
  }

  updateDebugPanel();
  resetStatButtons();
}
