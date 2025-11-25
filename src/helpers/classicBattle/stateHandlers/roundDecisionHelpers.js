import { debugLog } from "../../debug.js";
import { getOpponentJudoka } from "../cardSelection.js";
import { getStatValue } from "../../battle/index.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "../battleEvents.js";
import { resolveRound } from "../roundResolver.js";
import { resolveDelay } from "../timerUtils.js";
import { guard, guardAsync, scheduleGuard } from "../guard.js";
import { exposeDebugState, readDebugState } from "../debugHooks.js";
import { autoContinue } from "../autoContinue.js";
import isStateTransition from "../isStateTransition.js";

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
 * if not in roundDecision or already resolved → return
 * if no player choice → dispatch interrupt(stalledNoSelection)
 * outcomeEvent ← determineOutcomeEvent(store)
 * record debug guard timing
 * await dispatchOutcome(outcomeEvent, machine)
 * emit debug panel update
 * ```
 */
export async function computeAndDispatchOutcome(store, machine) {
  try {
    debugLog("DEBUG: computeAndDispatchOutcome start", { playerChoice: store?.playerChoice });
    if (!isStateTransition(null, "roundDecision")) return;
    const rd = readDebugState("roundDebug");
    const resolved = rd && typeof rd.resolvedAt === "number";
    if (resolved) return;
    if (!store?.playerChoice) {
      await machine.dispatch("interrupt", { reason: "stalledNoSelection" });
      return;
    }
    const outcomeEvent = determineOutcomeEvent(store);
    debugLog("DEBUG: computeAndDispatchOutcome outcomeEvent", { outcomeEvent });
    try {
      exposeDebugState("guardFiredAt", Date.now());
      exposeDebugState("guardOutcomeEvent", outcomeEvent || "none");
    } catch (err) {
      debugLog("DEBUG: exposeDebugState error", { error: err.message });
    }
    await dispatchOutcome(outcomeEvent, machine);
    emitBattleEvent("debugPanelUpdate");
  } catch (err) {
    debugLog("DEBUG: computeAndDispatchOutcome error", { error: err.message });
  }
}

/**
 * Determine the round outcome based on player and opponent stat values.
 *
 * @param {object} store - Battle state store
 * @returns {string|null} Outcome event string or null if unable to determine
 */
function determineOutcomeEvent(store) {
  try {
    const stat = store.playerChoice;
    const pCard = getElementIfDocument("player-card");
    const oCard = getElementIfDocument("opponent-card");
    const playerVal = getStatValue(pCard, stat);
    debugLog("DEBUG: computeAndDispatchOutcome values", { stat, playerVal });
    const opponentVal = getOpponentStatValue(stat, oCard);
    if (Number.isFinite(playerVal) && Number.isFinite(opponentVal)) {
      if (playerVal > opponentVal) return "outcome=winPlayer";
      if (playerVal < opponentVal) return "outcome=winOpponent";
      return "outcome=draw";
    }
  } catch (err) {
    debugLog("DEBUG: determineOutcomeEvent error", { error: err.message });
  }
  return null;
}

/**
 * Dispatch the outcome event to the machine, with microtask scheduling as fallback.
 *
 * @param {string|null} outcomeEvent - Outcome event string or null
 * @param {object} machine - State machine
 * @returns {Promise<void>}
 */
async function dispatchOutcomeEvent(outcomeEvent, machine) {
  try {
    await machine.dispatch(outcomeEvent);
    if (autoContinue) await machine.dispatch("continue");
  } catch (err) {
    debugLog("DEBUG: dispatchOutcomeEvent error", { outcomeEvent, error: err.message });
  }
}

/**
 * Dispatch outcome via async scheduler with fallback to setTimeout.
 *
 * @param {string|null} outcomeEvent - Outcome event string or null
 * @param {object} machine - State machine
 * @returns {Promise<void>}
 */
async function dispatchOutcome(outcomeEvent, machine) {
  if (outcomeEvent) {
    try {
      const run = () => dispatchOutcomeEvent(outcomeEvent, machine);
      if (typeof queueMicrotask === "function") {
        queueMicrotask(run);
      } else {
        setTimeout(run, 0);
      }
    } catch (err) {
      debugLog("DEBUG: dispatchOutcome queueMicrotask error", { error: err.message });
      await dispatchOutcomeEvent(outcomeEvent, machine);
    }
  } else {
    await machine.dispatch("interrupt", { reason: "guardNoOutcome" });
  }
}

/**
 * Record that the machine entered `roundDecision` for debug tracing.
 *
 * @returns {void}
 * @pseudocode
 * 1. Log debug entry when possible.
 * 2. Store timestamp in debug state.
 * 3. Emit `debugPanelUpdate`.
 */
export function recordEntry() {
  try {
    debugLog("DEBUG: Entering roundDecisionEnter");
  } catch (err) {
    debugLog("DEBUG: recordEntry debugLog error", { error: err.message });
  }
  try {
    if (typeof window !== "undefined") {
      exposeDebugState("roundDecisionEnter", Date.now());
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
    console.log("[DIAGNOSTIC] resolveSelectionIfPresent: no playerChoice, returning false");
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
    debugLog("DEBUG: roundDecision.resolveImmediate", { stat, playerVal, opponentVal });
  } catch (err) {
    debugLog("DEBUG: resolveSelectionIfPresent debugLog error", { error: err.message });
  }
  const delayMs = resolveDelay();
  console.log("[DIAGNOSTIC] resolveSelectionIfPresent: calling resolveRound with", { stat, playerVal, opponentVal, delayMs });
  await resolveRound(store, stat, playerVal, opponentVal, { delayMs });
  console.log("[DIAGNOSTIC] resolveSelectionIfPresent: resolveRound completed");
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
    if (pollId) clearInterval(pollId);
    if (timeoutId) clearTimeout(timeoutId);
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
    exposeDebugState("roundDecisionGuard", cancelFn);
  };
  setupCancel();

  return () => {
    guard(() => {
      if (typeof cancelFn === "function") {
        cancelFn();
      }
      exposeDebugState("roundDecisionGuard", null);
    });
  };
}

/**
 * Ensure the state machine leaves `roundDecision` shortly after resolution.
 *
 * @pseudocode
 * 1. After watchdog delay, check the machine's state.
 * 2. If still in `roundDecision`, dispatch `interrupt`.
 *
 * @param {import('../stateManager.js').ClassicBattleStateManager} machine - State machine.
 * @returns {void}
 */
export function schedulePostResolveWatchdog(machine) {
  setTimeout(() => {
    guardAsync(async () => {
      const still = machine.getState ? machine.getState() : null;
      if (still === "roundDecision") {
        await machine.dispatch("interrupt", { reason: "postResolveWatchdog" });
      }
    });
  }, POST_RESOLVE_WATCHDOG_DELAY_MS);
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
