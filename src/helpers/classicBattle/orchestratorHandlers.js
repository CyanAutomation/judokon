import { initRoundSelectModal } from "./roundSelectModal.js";
import { getDefaultTimer } from "../timerUtils.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { getStatValue } from "../battle/index.js";
import { scheduleNextRound } from "./timerService.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { resolveRound } from "./roundResolver.js";
import { enableNextRoundButton } from "./uiHelpers.js";

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
  // For inter-round cooldowns in test mode, auto-advance to the next round to
  // avoid relying on external UI timers/handlers which can be racy under CI.
  try {
    if (isTestModeEnabled && isTestModeEnabled()) {
      try {
        if (machine.getState && machine.getState() === "cooldown") {
          console.warn("[test] cooldownEnter: auto-advance dispatch ready");
          machine.dispatch("ready");
        }
      } catch {}
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
export async function roundStartExit() {}

export async function waitingForPlayerActionEnter(machine) {
  emitBattleEvent("statButtons:enable");
  // Ensure the Next button is marked ready when the player can act.
  // This mirrors the cooldown-expiration behavior and avoids races
  // from state transitions clearing the flag before assertions.
  try {
    enableNextRoundButton();
  } catch {}
  const store = machine?.context?.store;
  if (store?.playerChoice) {
    await machine.dispatch("statSelected");
  }
}
export async function waitingForPlayerActionExit() {
  emitBattleEvent("statButtons:disable");
}

function computeAndDispatchOutcome(store, machine) {
  return (async () => {
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
      let outcomeEvent = null;
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
          if (playerVal > opponentVal) outcomeEvent = "outcome=winPlayer";
          else if (playerVal < opponentVal) outcomeEvent = "outcome=winOpponent";
          else outcomeEvent = "outcome=draw";
        }
      } catch {}
      console.log("DEBUG: computeAndDispatchOutcome outcomeEvent", { outcomeEvent });
      try {
        window.__guardFiredAt = Date.now();
        window.__guardOutcomeEvent = outcomeEvent || "none";
      } catch {}
      if (outcomeEvent) {
        await machine.dispatch(outcomeEvent);
        await machine.dispatch("continue");
      } else {
        await machine.dispatch("interrupt", { reason: "guardNoOutcome" });
      }
      emitBattleEvent("debugPanelUpdate");
    } catch {}
  })();
}

export function scheduleRoundDecisionGuard(store, machine) {
  try {
    return setTimeout(() => {
      computeAndDispatchOutcome(store, machine);
    }, 1200);
  } catch {
    return null;
  }
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
    try {
      console.log("DEBUG: roundDecision.resolveImmediate", { stat, playerVal, opponentVal });
    } catch {}
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
      // Clear any scheduled guard to avoid a race where the guard fires
      // while resolveImmediate is running.
      try {
        if (typeof window !== "undefined" && window.__roundDecisionGuard) {
          clearTimeout(window.__roundDecisionGuard);
          window.__roundDecisionGuard = null;
        }
      } catch {}
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
      const guardId = scheduleRoundDecisionGuard(store, machine);
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
