import { initRoundSelectModal } from "./roundSelectModal.js";
import { getDefaultTimer } from "../timerUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { getStatValue } from "../battle/index.js";
import { scheduleNextRound } from "./timerService.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { resolveRound } from "./roundResolver.js";

/**
 * Orchestrator state transition helpers.
 *
 * @pseudocode
 * 1. Provide helpers used by orchestrator on-enter/on-exit handlers.
 * 2. Implement transition guards and glue to UI events (emitBattleEvent).
 * 3. Keep side-effects isolated and recover gracefully on errors.
 */
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
  // Use a microtask / setTimeout wrapper when invoking startClicked so that
  // caller code (for example, `?autostart=1`) doesn't attempt to dispatch on
  // the `machine` before `initClassicBattleOrchestrator` has finished
  // assigning it. This prevents a startup race where `machine` is null.
  await initRoundSelectModal(() => {
    // schedule the dispatch on the next tick; initRoundSelectModal awaits the
    // provided callback, so return a resolved Promise to keep behavior simple.
    try {
      setTimeout(() => {
        try {
          machine?.dispatch("startClicked");
        } catch {}
      }, 0);
    } catch {}
    return Promise.resolve();
  });
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
    // advance after duration+1 seconds to avoid stalling the state machine.
    let fallbackTimer = null;
    try {
      fallbackTimer = setTimeout(
        () => {
          try {
            offBattleEvent("countdownFinished", onFinished);
          } catch {}
          try {
            machine.dispatch("ready");
          } catch {}
        },
        (duration + 1) * 1000 + 200
      );
    } catch {}
  }
}
export async function cooldownExit() {}

export async function roundStartEnter(machine) {
  const { startRoundWrapper, doStartRound, store } = machine.context;
  try {
    if (typeof startRoundWrapper === "function") await startRoundWrapper();
    else if (typeof doStartRound === "function") await doStartRound(store);
  } catch {
    try {
      emitBattleEvent("scoreboardShowMessage", "Round start error. Recovering…");
      emitBattleEvent("debugPanelUpdate");
      await machine.dispatch("interrupt", { reason: "roundStartError" });
    } catch {}
  } finally {
    await machine.dispatch("cardsRevealed");
  }
}
export async function roundStartExit() {}

/**
 * Prepare for player stat selection.
 *
 * @pseudocode
 * 1. Enable stat buttons for interaction.
 * 2. If both a choice and confirmation exist, dispatch `statSelected`.
 */
export async function waitingForPlayerActionEnter(machine) {
  emitBattleEvent("statButtons:enable");
  const store = machine?.context?.store;
  if (store?.playerChoice && store?.selectionMade) {
    await machine.dispatch("statSelected");
  }
}
export async function waitingForPlayerActionExit() {
  emitBattleEvent("statButtons:disable");
}

export async function roundDecisionEnter(machine) {
  const { store } = machine.context;

  const resolveImmediate = async () => {
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
    await resolveRound(store, stat, playerVal, opponentVal);
  };

  try {
    if (typeof window !== "undefined") {
      window.__roundDecisionEnter = Date.now();
    }
  } catch {}
  emitBattleEvent("debugPanelUpdate");

  if (store.playerChoice) {
    try {
      await resolveImmediate();
    } catch {
      try {
        emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…");
        emitBattleEvent("debugPanelUpdate");
        await machine.dispatch("interrupt", { reason: "roundResolutionError" });
      } catch {}
    }
    return;
  }

  let waited = 0;
  const maxWait = 1500;
  while (!store.playerChoice && waited < maxWait) {
    await new Promise((r) => setTimeout(r, 50));
    waited += 50;
  }
  try {
    if (typeof window !== "undefined") {
      const guardId = setTimeout(async () => {
        try {
          if (!isStateTransition(null, "roundDecision")) return;
          const rd = window.__roundDebug;
          const resolved = rd && typeof rd.resolvedAt === "number";
          if (resolved) return;
          if (!store.playerChoice) {
            await machine.dispatch("interrupt", { reason: "stalledNoSelection" });
            return;
          }
          let outcomeEvent = null;
          try {
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
            if (Number.isFinite(playerVal) && Number.isFinite(opponentVal)) {
              if (playerVal > opponentVal) outcomeEvent = "outcome=winPlayer";
              else if (playerVal < opponentVal) outcomeEvent = "outcome=winOpponent";
              else outcomeEvent = "outcome=draw";
            }
          } catch {}
          try {
            window.__guardFiredAt = Date.now();
            window.__guardOutcomeEvent = outcomeEvent || "none";
          } catch {}
          if (outcomeEvent) {
            await machine.dispatch(outcomeEvent);
            await machine.dispatch("continue");
            scheduleNextRound({ matchEnded: false });
          } else {
            await machine.dispatch("interrupt", { reason: "guardNoOutcome" });
          }
          emitBattleEvent("debugPanelUpdate");
        } catch {}
      }, 1200);
      window.__roundDecisionGuard = guardId;
    }
  } catch {}
  if (!store.playerChoice) {
    try {
      emitBattleEvent("scoreboardShowMessage", "No selection detected. Interrupting round.");
    } catch {}
    emitBattleEvent("debugPanelUpdate");
    await machine.dispatch("interrupt", { reason: "noSelection" });
    return;
  }
  try {
    await resolveImmediate();
  } catch {
    try {
      emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…");
      emitBattleEvent("debugPanelUpdate");
      await machine.dispatch("interrupt", { reason: "roundResolutionError" });
    } catch {}
  }
}
export async function roundDecisionExit() {}

/**
 * Reset round-specific store data.
 *
 * @pseudocode
 * 1. Clear `playerChoice` to `null`.
 * 2. Set `selectionMade` to `false` for the next round.
 */
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
    await machine.dispatch("cooldown");
  }
}
export async function interruptRoundExit() {}

export async function interruptMatchEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Match interrupted: ${payload.reason}`);
  }
  await machine.dispatch("matchOver", payload);
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
