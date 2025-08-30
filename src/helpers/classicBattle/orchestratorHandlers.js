import { getDefaultTimer } from "../timerUtils.js";
import { getNextRoundControls } from "./timerService.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { getStatValue } from "../battle/index.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { resolveRound } from "./roundResolver.js";
// Removed unused import for enableNextRoundButton

// Test-mode flag for muting noisy logs in Vitest
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

export function isStateTransition(from, to) {
  try {
    if (typeof document === "undefined") return false;
    const current = document.body?.dataset.battleState;
    const prev = document.body?.dataset.prevBattleState;
    if (from === null || from === undefined) {
      return current === to;
    }
    return prev === from && current === to;
  } catch {
    return false;
  }
}

export async function waitingForMatchStartEnter(machine) {
  if (isStateTransition("waitingForMatchStart", "waitingForMatchStart")) return;
  const { doResetGame } = machine.context;
  if (typeof doResetGame === "function") doResetGame();
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
}
export async function waitingForMatchStartExit() {}

export async function matchStartEnter(machine) {
  await machine.dispatch("ready", { initial: true });
}
export async function matchStartExit() {}

export async function cooldownEnter(machine, payload) {
  if (payload?.initial) {
    let duration = 3;
    try {
      const val = await getDefaultTimer("matchStartTimer");
      if (typeof val === "number") duration = val;
    } catch {}
    duration = Math.max(1, Number(duration));
    const onFinished = () => {
      try {
        offBattleEvent("countdownFinished", onFinished);
      } catch {}
      try {
        if (fallbackTimer) clearTimeout(fallbackTimer);
      } catch {}
      try {
        machine.dispatch("ready");
      } catch {}
    };
    onBattleEvent("countdownFinished", onFinished);

    // Emit countdown start for UI timers
    emitBattleEvent("countdownStart", { duration });

    // Fallback: if no countdownFinished event arrives (headless/test environments),
    // advance after `duration` seconds to avoid stalling the state machine.
    let fallbackTimer = null;
    try {
      fallbackTimer = setTimeout(
        () => {
          onFinished();
        },
        duration * 1000 + 200
      );
    } catch {}
  }
  // For inter-round cooldowns with no scheduled next-round timer (e.g., after
  // an interrupt path like timeout/noSelection), emit a countdown so the UI
  // advances reliably even without a round result. This prevents hangs.
  try {
    const controls = getNextRoundControls?.();
    if (!controls || (!controls.timer && !controls.ready)) {
      let duration = 0;
      try {
        duration = computeNextRoundCooldown();
      } catch {}
      // `computeNextRoundCooldown` enforces a 1s floor.
      // Mirror scheduleNextRound minimal UI: enable Next immediately and
      // mark as ready when the minimum 1s countdown expires.
      const btn = typeof document !== "undefined" ? document.getElementById("next-button") : null;
      if (btn) {
        btn.disabled = false;
        delete btn.dataset.nextReady;
      }
      const onFinished = () => {
        try {
          offBattleEvent("countdownFinished", onFinished);
        } catch {}
        try {
          if (fallbackTimer) clearTimeout(fallbackTimer);
        } catch {}
        if (btn) {
          btn.dataset.nextReady = "true";
          btn.disabled = false;
        }
        try {
          emitBattleEvent("nextRoundTimerReady");
        } catch {}
        try {
          machine.dispatch("ready");
        } catch {}
      };
      onBattleEvent("countdownFinished", onFinished);
      emitBattleEvent("countdownStart", { duration });
      let fallbackTimer = null;
      try {
        const ms = Math.max(0, Number(duration) * 1000) + 200;
        fallbackTimer = setTimeout(() => {
          try {
            offBattleEvent("countdownFinished", onFinished);
          } catch {}
          onFinished();
        }, ms);
      } catch {}
      return;
    }
  } catch {}
}
export async function cooldownExit() {}

export async function roundStartEnter(machine) {
  const { startRoundWrapper, doStartRound, store } = machine.context;
  // In Playwright test mode, set a short fallback to avoid UI stalls
  let fallback = null;
  try {
    if (isTestModeEnabled && isTestModeEnabled()) {
      fallback = setTimeout(() => {
        try {
          const state = machine.getState ? machine.getState() : null;
          if (state === "roundStart") machine.dispatch("cardsRevealed");
        } catch {}
      }, 50);
    }
  } catch {}
  // Start the round asynchronously; do not block state progression on opponent card rendering.
  try {
    const p =
      typeof startRoundWrapper === "function"
        ? startRoundWrapper()
        : typeof doStartRound === "function"
          ? doStartRound(store)
          : Promise.resolve();
    Promise.resolve(p).catch(async () => {
      try {
        if (fallback) clearTimeout(fallback);
      } catch {}
      try {
        emitBattleEvent("scoreboardShowMessage", "Round start error. Recovering…");
        emitBattleEvent("debugPanelUpdate");
        await machine.dispatch("interrupt", { reason: "roundStartError" });
      } catch {}
    });
  } catch {
    try {
      if (fallback) clearTimeout(fallback);
    } catch {}
    try {
      emitBattleEvent("scoreboardShowMessage", "Round start error. Recovering…");
      emitBattleEvent("debugPanelUpdate");
      await machine.dispatch("interrupt", { reason: "roundStartError" });
    } catch {}
    return;
  }
  // Immediately proceed to stat selection if still in roundStart.
  try {
    if (fallback) clearTimeout(fallback);
  } catch {}
  try {
    const state = machine.getState ? machine.getState() : null;
    if (state === "roundStart") await machine.dispatch("cardsRevealed");
  } catch {}
}
/**
 * Ensure the machine transitions to player selection after round start.
 *
 * @pseudocode
 * 1. Start round wrapper or doStartRound asynchronously to render cards.
 * 2. Install a short fallback to advance state in headless/test mode.
 * 3. If rendering fails, emit a scoreboard message and dispatch interrupt.
 * 4. When cards are ready and machine still in roundStart, dispatch 'cardsRevealed'.
 */
export async function roundStartExit() {}

export async function waitingForPlayerActionEnter(machine) {
  emitBattleEvent("statButtons:enable");
  // Do NOT mark the Next button as ready here. The Next button is reserved
  // for advancing after cooldown between rounds. Enabling it during stat
  // selection can cause `scheduleNextRound` to short-circuit, skipping the
  // cooldown timer and preventing the state machine from progressing — seen
  // as a "hang" on the classic battle page. The CLI page never enables Next
  // during selection and does not suffer this issue. Keep Next controlled by
  // `scheduleNextRound` only.
  const store = machine?.context?.store;
  if (store?.playerChoice) {
    await machine.dispatch("statSelected");
  }
}
export async function waitingForPlayerActionExit() {
  emitBattleEvent("statButtons:disable");
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
    console.log("DEBUG: computeAndDispatchOutcome start", { playerChoice: store?.playerChoice });
    if (!isStateTransition(null, "roundDecision")) return;
    const rd = window.__roundDebug;
    const resolved = rd && typeof rd.resolvedAt === "number";
    if (resolved) return;
    if (!store?.playerChoice) {
      await machine.dispatch("interrupt", { reason: "stalledNoSelection" });
      return;
    }
    const outcomeEvent = determineOutcomeEvent(store);
    console.log("DEBUG: computeAndDispatchOutcome outcomeEvent", { outcomeEvent });
    try {
      window.__guardFiredAt = Date.now();
      window.__guardOutcomeEvent = outcomeEvent || "none";
    } catch {}
    await dispatchOutcome(outcomeEvent, machine);
    emitBattleEvent("debugPanelUpdate");
  } catch {}
}

/**
 * Determine the outcome event based on player and opponent stat values.
 *
 * @param {object} store
 * @returns {string|null}
 * @pseudocode
 * ```
 * read player and opponent values
 * if both numbers → return corresponding outcome event
 * else → null
 * ```
 */
function determineOutcomeEvent(store) {
  try {
    const stat = store.playerChoice;
    const pCard = document.getElementById("player-card");
    const oCard = document.getElementById("opponent-card");
    const playerVal = getStatValue(pCard, stat);
    console.log("DEBUG: computeAndDispatchOutcome values", { stat, playerVal });
    let opponentVal = 0;
    try {
      const opp = getOpponentJudoka();
      const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
      opponentVal = Number.isFinite(raw) ? raw : getStatValue(oCard, stat);
    } catch {
      opponentVal = getStatValue(oCard, stat);
    }
    if (Number.isFinite(playerVal) && Number.isFinite(opponentVal)) {
      if (playerVal > opponentVal) return "outcome=winPlayer";
      if (playerVal < opponentVal) return "outcome=winOpponent";
      return "outcome=draw";
    }
  } catch {}
  return null;
}

/**
 * Dispatch the outcome or interrupt if none exists.
 *
 * @param {string|null} outcomeEvent
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * ```
 * if outcome event → schedule dispatch(outcomeEvent) and dispatch(continue)
 * else → dispatch interrupt(guardNoOutcome)
 * ```
 */
async function dispatchOutcome(outcomeEvent, machine) {
  if (outcomeEvent) {
    // Avoid re-entrant dispatch inside onEnter; schedule transitions
    // after onEnter/microtasks complete.
    try {
      const run = async () => {
        try {
          await machine.dispatch(outcomeEvent);
          await machine.dispatch("continue");
        } catch {}
      };
      if (typeof queueMicrotask === "function") queueMicrotask(run);
      setTimeout(run, 0);
    } catch {
      try {
        await machine.dispatch(outcomeEvent);
        await machine.dispatch("continue");
      } catch {}
    }
  } else {
    await machine.dispatch("interrupt", { reason: "guardNoOutcome" });
  }
}

/**
 * Schedule a timeout that computes the round outcome if resolution stalls.
 *
 * @param {object} store
 * @param {object} machine
 * @returns {number|null} guard timeout id
 * @pseudocode
 * ```
 * setTimeout → computeAndDispatchOutcome(store, machine)
 * store id on window for cancellation
 * return id
 * ```
 */
export function scheduleRoundDecisionGuard(store, machine) {
  try {
    const id = setTimeout(() => {
      computeAndDispatchOutcome(store, machine);
    }, 1200);
    try {
      if (typeof window !== "undefined") window.__roundDecisionGuard = id;
    } catch {}
    return id;
  } catch {
    return null;
  }
}

/**
 * Record entry into the round decision state for debug purposes.
 *
 * @pseudocode
 * ```
 * log debug entry if not in Vitest
 * record timestamp on window
 * emit debug panel update
 * ```
 */
export function recordRoundDecisionEntry() {
  try {
    if (!IS_VITEST) console.log("DEBUG: Entering roundDecisionEnter");
  } catch {}
  try {
    if (typeof window !== "undefined") {
      window.__roundDecisionEnter = Date.now();
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
 * read stat values
 * log debug values
 * await resolveRound
 * return true
 * ```
 */
export async function resolveSelectionIfPresent(store) {
  if (!store.playerChoice) return false;
  const stat = store.playerChoice;
  const pCard = document.getElementById("player-card");
  const oCard = document.getElementById("opponent-card");
  const playerVal = getStatValue(pCard, stat);
  let opponentVal = 0;
  try {
    const opp = getOpponentJudoka();
    const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
    opponentVal = Number.isFinite(raw) ? raw : getStatValue(oCard, stat);
  } catch {
    opponentVal = getStatValue(oCard, stat);
  }
  try {
    console.log("DEBUG: roundDecision.resolveImmediate", { stat, playerVal, opponentVal });
  } catch {}
  await resolveRound(store, stat, playerVal, opponentVal);
  return true;
}

/**
 * Orchestrate round decision entry by scheduling a guard and resolving any
 * immediate selection.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * ```
 * record round decision entry
 * schedule guard to compute outcome
 * if resolveSelectionIfPresent(store) → schedule watchdog and return
 * wait up to 1.5s for player choice
 * if still none → show message and interrupt
 * else resolveSelectionIfPresent(store); on error → show message and interrupt
 * schedule watchdog after resolve
 * ```
 */
export async function roundDecisionEnter(machine) {
  const { store } = machine.context;
  recordRoundDecisionEntry();
  scheduleRoundDecisionGuard(store, machine);

  try {
    const resolved = await resolveSelectionIfPresent(store);
    if (resolved) {
      try {
        if (typeof window !== "undefined" && window.__roundDecisionGuard) {
          clearTimeout(window.__roundDecisionGuard);
          window.__roundDecisionGuard = null;
        }
      } catch {}
      try {
        setTimeout(async () => {
          try {
            const still = machine.getState ? machine.getState() : null;
            if (still === "roundDecision") {
              await machine.dispatch("interrupt", { reason: "postResolveWatchdog" });
            }
          } catch {}
        }, 600);
      } catch {}
      return;
    }
  } catch {
    try {
      if (typeof window !== "undefined" && window.__roundDecisionGuard) {
        clearTimeout(window.__roundDecisionGuard);
        window.__roundDecisionGuard = null;
      }
    } catch {}
    try {
      emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…");
      emitBattleEvent("debugPanelUpdate");
      await machine.dispatch("interrupt", { reason: "roundResolutionError" });
    } catch {}
    return;
  }

  let waited = 0;
  const maxWait = 1500;
  while (!store.playerChoice && waited < maxWait) {
    await new Promise((r) => setTimeout(r, 50));
    waited += 50;
  }
  if (!store.playerChoice) {
    try {
      emitBattleEvent("scoreboardShowMessage", "No selection detected. Interrupting round.");
    } catch {}
    emitBattleEvent("debugPanelUpdate");
    await machine.dispatch("interrupt", { reason: "noSelection" });
    return;
  }
  try {
    await resolveSelectionIfPresent(store);
    try {
      if (typeof window !== "undefined" && window.__roundDecisionGuard) {
        clearTimeout(window.__roundDecisionGuard);
        window.__roundDecisionGuard = null;
      }
    } catch {}
    try {
      setTimeout(async () => {
        try {
          const still = machine.getState ? machine.getState() : null;
          if (still === "roundDecision") {
            await machine.dispatch("interrupt", { reason: "postResolveWatchdog" });
          }
        } catch {}
      }, 600);
    } catch {}
  } catch {
    try {
      if (typeof window !== "undefined" && window.__roundDecisionGuard) {
        clearTimeout(window.__roundDecisionGuard);
        window.__roundDecisionGuard = null;
      }
    } catch {}
    try {
      emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…");
      emitBattleEvent("debugPanelUpdate");
      await machine.dispatch("interrupt", { reason: "roundResolutionError" });
    } catch {}
  }
}
export async function roundDecisionExit() {
  // Clear any scheduled decision guard to prevent late outcome dispatch.
  try {
    if (typeof window !== "undefined" && window.__roundDecisionGuard) {
      clearTimeout(window.__roundDecisionGuard);
      window.__roundDecisionGuard = null;
    }
  } catch {}
}

export async function roundOverEnter(machine) {
  const store = machine?.context?.store;
  if (store) {
    store.playerChoice = null;
    store.selectionMade = false;
  }
}
export async function roundOverExit() {}

export async function matchDecisionEnter() {}
export async function matchDecisionExit() {}

export async function matchOverEnter() {}
export async function matchOverExit() {}

export async function interruptRoundEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  // Ensure store selection is cleared when an interrupt occurs so leftover
  // `playerChoice` doesn't persist and block future rounds.
  try {
    const store = machine?.context?.store;
    if (store) {
      store.playerChoice = null;
      store.selectionMade = false;
    }
    if (typeof window !== "undefined" && window.__roundDecisionGuard) {
      clearTimeout(window.__roundDecisionGuard);
      window.__roundDecisionGuard = null;
    }
  } catch {}
  // Expose the last interrupt reason for diagnostics and tests
  try {
    if (typeof window !== "undefined") {
      window.__classicBattleLastInterruptReason = payload?.reason || "";
    }
  } catch {}
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Round interrupted: ${payload.reason}`);
  }
  if (payload?.adminTest) {
    await machine.dispatch("roundModification", payload);
  } else {
    // Use the state-table-defined trigger to reach cooldown
    await machine.dispatch("restartRound");
  }
}
export async function interruptRoundExit() {}

export async function interruptMatchEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Match interrupted: ${payload.reason}`);
  }
  // Return to lobby via state-table-defined trigger
  await machine.dispatch("toLobby", payload);
}
export async function interruptMatchExit() {}

export async function roundModificationEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.modification) {
    emitBattleEvent("scoreboardShowMessage", `Round modified: ${payload.modification}`);
  }
  if (payload?.resumeRound) {
    await machine.dispatch("roundStart");
  } else {
    await machine.dispatch("cooldown");
  }
}
export async function roundModificationExit() {}

export const onEnterHandlers = {
  waitingForMatchStart: waitingForMatchStartEnter,
  matchStart: matchStartEnter,
  cooldown: cooldownEnter,
  roundStart: roundStartEnter,
  waitingForPlayerAction: waitingForPlayerActionEnter,
  roundDecision: roundDecisionEnter,
  roundOver: roundOverEnter,
  matchDecision: matchDecisionEnter,
  matchOver: matchOverEnter,
  interruptRound: interruptRoundEnter,
  interruptMatch: interruptMatchEnter,
  roundModification: roundModificationEnter
};

export const onExitHandlers = {
  waitingForMatchStart: waitingForMatchStartExit,
  matchStart: matchStartExit,
  cooldown: cooldownExit,
  roundStart: roundStartExit,
  waitingForPlayerAction: waitingForPlayerActionExit,
  roundDecision: roundDecisionExit,
  roundOver: roundOverExit,
  matchDecision: matchDecisionExit,
  matchOver: matchOverExit,
  interruptRound: interruptRoundExit,
  interruptMatch: interruptMatchExit,
  roundModification: roundModificationExit
};
