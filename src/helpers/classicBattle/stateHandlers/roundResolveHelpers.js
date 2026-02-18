import { debugLog } from "../../debug.js";
import { getOpponentJudoka } from "../cardSelection.js";
import { getStatValue } from "../../battle/index.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "../battleEvents.js";
import { resolveRound } from "../roundResolver.js";
import { guard, guardAsync, scheduleGuard } from "../guard.js";
import { exposeDebugState, readDebugState } from "../debugHooks.js";
import isStateTransition from "../isStateTransition.js";
import { createComponentLogger } from "../debugLogger.js";
import { getScores } from "../../BattleEngine.js";

const resolverLogger = createComponentLogger("RoundResolveHelpers");

// Magic number constants for timing coordination
const PLAYER_CHOICE_POLL_INTERVAL_MS = 50;
const PLAYER_CHOICE_TIMEOUT_MS = 1500;
const GUARD_SELECTION_RESOLUTION_DELAY_MS = 1200;
const POST_RESOLVE_WATCHDOG_DELAY_MS = 600;

function getElementIfDocument(id) {
  return typeof document !== "undefined" ? document.getElementById(id) : null;
}

/**
 * Get the opponent's stat value with fallback to DOM-based calculation.
 *
 * @param {string} stat - Stat key (e.g., "power", "speed")
 * @param {HTMLElement|null} fallbackCard - DOM card element fallback
 * @returns {number} Opponent stat value or fallback value
 */
function getOpponentStatValue(stat, fallbackCard) {
  try {
    const opp = getOpponentJudoka();
    const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
    return Number.isFinite(raw) ? raw : getStatValue(fallbackCard, stat);
  } catch (err) {
    debugLog("DEBUG: getOpponentStatValue error", { stat, error: err.message });
    return getStatValue(fallbackCard, stat);
  }
}

/**
 * Compute round outcome and dispatch the resulting events.
 *
 * @param {object} store
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * ```
 * if not in roundResolve or already resolved → return
 * if no player choice → dispatch outcome=draw fallback
 * resolve round immediately via resolveSelectionIfPresent(store)
 * record debug guard timing
 * fallback to draw only when resolution is unavailable
 * emit debug panel update
 * ```
 */
export async function computeAndDispatchOutcome(store, machine) {
  try {
    debugLog("DEBUG: computeAndDispatchOutcome start", { playerChoice: store?.playerChoice });
    if (!isStateTransition(null, "roundResolve")) return;
    const rd = readDebugState("roundDebug");
    const alreadyResolved = rd && typeof rd.resolvedAt === "number";
    if (alreadyResolved) return;
    if (!store?.playerChoice) {
      await dispatchFallbackOutcome(machine, "stalledNoSelection");
      return;
    }
    const resolved = await resolveSelectionIfPresent(store);
    try {
      exposeDebugState("guardFiredAt", Date.now());
      exposeDebugState("guardOutcomeEvent", resolved ? "resolved" : "none");
    } catch (err) {
      debugLog("DEBUG: exposeDebugState error", { error: err.message });
    }
    if (!resolved) {
      await dispatchFallbackOutcome(machine, "guardNoOutcome");
    }
    emitBattleEvent("debugPanelUpdate");
  } catch (err) {
    debugLog("DEBUG: computeAndDispatchOutcome error", { error: err.message });
  }
}

/**
 * Record that the machine entered `roundResolve` for debug tracing.
 *
 * @returns {void}
 * @pseudocode
 * 1. Log debug entry when possible.
 * 2. Store timestamp in debug state.
 * 3. Emit `debugPanelUpdate`.
 */
export function recordEntry() {
  try {
    debugLog("DEBUG: Entering roundResolveEnter");
  } catch (err) {
    debugLog("DEBUG: recordEntry debugLog error", { error: err.message });
  }
  try {
    if (typeof window !== "undefined") {
      exposeDebugState("roundResolveEnter", Date.now());
    }
  } catch (err) {
    debugLog("DEBUG: recordEntry exposeDebugState error", { error: err.message });
  }
  emitBattleEvent("debugPanelUpdate");
}

/**
 * Resolve the round immediately if a selection exists.
 *
 * @param {object} store
 * @returns {Promise<boolean>} whether a resolution occurred
 * @pseudocode
 * ```
 * if no player choice → return false
 * read player and opponent values
 * log debug values
 * await resolveRound
 * return true
 * ```
 */
export async function resolveSelectionIfPresent(store) {
  if (!store.playerChoice) {
    resolverLogger.debug("No playerChoice, returning false");
    return false;
  }
  const stat = store.playerChoice;
  const pCard = getElementIfDocument("player-card");
  const oCard = getElementIfDocument("opponent-card");
  let playerVal = 0;
  if (store.currentPlayerJudoka?.stats) {
    const raw = Number(store.currentPlayerJudoka.stats[stat]);
    playerVal = Number.isFinite(raw) ? raw : 0;
  } else {
    playerVal = getStatValue(pCard, stat);
  }
  const opponentVal = getOpponentStatValue(stat, oCard);
  try {
    debugLog("DEBUG: roundResolve.resolveImmediate", { stat, playerVal, opponentVal });
  } catch (err) {
    debugLog("DEBUG: resolveSelectionIfPresent debugLog error", { error: err.message });
  }
  resolverLogger.debug("Calling resolveRound", {
    stat,
    playerVal,
    opponentVal
  });
  await resolveRound(store, stat, playerVal, opponentVal);
  resolverLogger.debug("resolveRound completed");
  return true;
}

/**
 * Await the player's stat choice with timeout safeguards.
 *
 * @pseudocode
 * 1. If `store.playerChoice` already set → resolve immediately.
 * 2. Otherwise race event listener, polling, and timeout to resolve or reject.
 *
 * @param {ReturnType<import('../roundManager.js').createBattleStore>} store - Battle state store.
 * @param {number} timeoutMs - Milliseconds before rejecting.
 * @returns {Promise<void>} Resolves when choice made; rejects on timeout.
 */
export function waitForPlayerChoice(store, timeoutMs) {
  if (store.playerChoice) return Promise.resolve();

  let handler;
  let pollId;
  let timeoutId;

  const cleanup = () => {
    offBattleEvent("statSelected", handler);
    if (pollId !== null && pollId !== undefined) clearInterval(pollId);
    if (timeoutId !== null && timeoutId !== undefined) clearTimeout(timeoutId);
  };

  const eventPromise = new Promise((resolve) => {
    handler = () => {
      cleanup();
      resolve();
    };
    onBattleEvent("statSelected", handler);
  });

  const storePromise = new Promise((resolve) => {
    pollId = setInterval(() => {
      if (store.playerChoice) {
        cleanup();
        resolve();
      }
    }, PLAYER_CHOICE_POLL_INTERVAL_MS);
  });

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, timeoutMs);
  });

  return Promise.race([eventPromise, storePromise, timeoutPromise]);
}

/**
 * Convenience wrapper waiting a fixed timeout for player choice.
 *
 * @pseudocode
 * 1. Delegate to `waitForPlayerChoice(store, PLAYER_CHOICE_TIMEOUT_MS)`.
 *
 * @param {ReturnType<import('../roundManager.js').createBattleStore>} store - Battle state store.
 * @returns {Promise<void>}
 */
export async function awaitPlayerChoice(store) {
  await waitForPlayerChoice(store, PLAYER_CHOICE_TIMEOUT_MS);
}

/**
 * Schedule a watchdog to resolve the round if selection stalls.
 *
 * @pseudocode
 * 1. Use `scheduleGuard` to call `computeAndDispatchOutcome` after guard delay.
 * 2. Store cancel function in closure and return a cleanup function.
 *
 * @param {ReturnType<import('../roundManager.js').createBattleStore>} store - Battle store.
 * @param {import('../stateManager.js').ClassicBattleStateManager} machine - State machine.
 * @returns {() => void} Cleanup that cancels the guard.
 */
export function guardSelectionResolution(store, machine) {
  let cancelFn;
  const setupCancel = () => {
    cancelFn = scheduleGuard(GUARD_SELECTION_RESOLUTION_DELAY_MS, () =>
      computeAndDispatchOutcome(store, machine)
    );
    exposeDebugState("roundResolveGuard", cancelFn);
  };
  setupCancel();

  return () => {
    guard(() => {
      if (typeof cancelFn === "function") {
        cancelFn();
      }
      exposeDebugState("roundResolveGuard", null);
    });
  };
}

/**
 * Ensure the state machine leaves `roundResolve` shortly after resolution.
 *
 * @pseudocode
 * 1. After watchdog delay, check the machine's state.
 * 2. If still in `roundResolve`, dispatch outcome fallback.
 *
 * @param {import('../stateManager.js').ClassicBattleStateManager} machine - State machine.
 * @param {string|number} token - Per-entry token used to invalidate stale watchdogs.
 * @returns {() => void} Cleanup that cancels the watchdog timer.
 */
export function schedulePostResolveWatchdog(machine, token) {
  let canceled = false;
  const timeoutId = setTimeout(() => {
    guardAsync(async () => {
      if (canceled) return;
      const currentToken = readDebugState("roundResolveWatchdogToken");
      if (currentToken !== token) return;
      const still = machine.getState ? machine.getState() : null;
      if (still === "roundResolve") {
        await dispatchFallbackOutcome(machine, "postResolveWatchdog");
      }
    });
  }, POST_RESOLVE_WATCHDOG_DELAY_MS);

  return () => {
    canceled = true;
    clearTimeout(timeoutId);
  };
}

function buildFallbackEvaluationPayload(reason) {
  let scores = { player: 0, opponent: 0 };
  try {
    const engineScores = getScores?.();
    scores = {
      player: Number(engineScores?.playerScore) || 0,
      opponent: Number(engineScores?.opponentScore) || 0
    };
  } catch {}

  return {
    outcome: "draw",
    reason,
    message: "No selection detected. Resolving as draw.",
    scores,
    source: "roundResolveFallback"
  };
}

async function dispatchFallbackOutcome(machine, reason) {
  const evaluationPayload = buildFallbackEvaluationPayload(reason);
  try {
    emitBattleEvent("round.evaluated", evaluationPayload);
    await machine.dispatch("outcome=draw", { reason, evaluationPayload });
  } catch (err) {
    debugLog("DEBUG: dispatchFallbackOutcome error", { reason, error: err.message });
  }
}

export default {
  computeAndDispatchOutcome,
  recordEntry,
  resolveSelectionIfPresent,
  waitForPlayerChoice,
  awaitPlayerChoice,
  guardSelectionResolution,
  schedulePostResolveWatchdog
};
