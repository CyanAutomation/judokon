import { debugLog } from "../../debug.js";
import { getOpponentJudoka } from "../cardSelection.js";
import { getStatValue } from "../../battle/index.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "../battleEvents.js";
import { resolveRound } from "../roundResolver.js";
import { guard, guardAsync, scheduleGuard } from "../guard.js";
import { exposeDebugState, readDebugState } from "../debugHooks.js";
import { autoContinue } from "../autoContinue.js";
import isStateTransition from "../isStateTransition.js";

function getElementIfDocument(id) {
  return typeof document !== "undefined" ? document.getElementById(id) : null;
}

function getOpponentStatValue(stat, fallbackCard) {
  try {
    const opp = getOpponentJudoka();
    const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
    return Number.isFinite(raw) ? raw : getStatValue(fallbackCard, stat);
  } catch {
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
    } catch {}
    await dispatchOutcome(outcomeEvent, machine);
    emitBattleEvent("debugPanelUpdate");
  } catch {}
}

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
  } catch {}
  return null;
}

async function dispatchOutcome(outcomeEvent, machine) {
  if (outcomeEvent) {
    try {
      const run = async () => {
        try {
          await machine.dispatch(outcomeEvent);
          if (autoContinue) await machine.dispatch("continue");
        } catch {}
      };
      if (typeof queueMicrotask === "function") {
        queueMicrotask(run);
      } else {
        setTimeout(run, 0);
      }
    } catch {
      try {
        await machine.dispatch(outcomeEvent);
        if (autoContinue) await machine.dispatch("continue");
      } catch {}
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
  } catch {}
  try {
    if (typeof window !== "undefined") {
      exposeDebugState("roundDecisionEnter", Date.now());
    }
  } catch {}
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
  if (!store.playerChoice) return false;
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
  } catch {}
  await resolveRound(store, stat, playerVal, opponentVal);
  return true;
}

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
    }, 50);
  });

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, timeoutMs);
  });

  return Promise.race([eventPromise, storePromise, timeoutPromise]);
}

export async function awaitPlayerChoice(store) {
  await waitForPlayerChoice(store, 1500);
}

export function guardSelectionResolution(store, machine) {
  const cancel = scheduleGuard(1200, () => computeAndDispatchOutcome(store, machine));
  exposeDebugState("roundDecisionGuard", cancel);
  return () => {
    guard(() => {
      const fn = readDebugState("roundDecisionGuard");
      if (typeof fn === "function") fn();
      exposeDebugState("roundDecisionGuard", null);
    });
  };
}

export function schedulePostResolveWatchdog(machine) {
  setTimeout(() => {
    guardAsync(async () => {
      const still = machine.getState ? machine.getState() : null;
      if (still === "roundDecision") {
        await machine.dispatch("interrupt", { reason: "postResolveWatchdog" });
      }
    });
  }, 600);
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
