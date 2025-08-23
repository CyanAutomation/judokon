import { BattleStateMachine } from "./stateMachine.js";
import {
  waitingForMatchStartEnter,
  matchStartEnter,
  cooldownEnter,
  roundStartEnter,
  waitingForPlayerActionEnter,
  roundDecisionEnter,
  roundOverEnter,
  matchDecisionEnter,
  matchOverEnter,
  interruptRoundEnter,
  interruptMatchEnter,
  roundModificationEnter,
  isStateTransition
} from "./orchestratorHandlers.js";
import { resetGame as resetGameLocal, startRound as startRoundLocal } from "./roundManager.js";
import { emitBattleEvent } from "./battleEvents.js";
import { setMachine } from "./eventDispatcher.js";

let machine = null;

/**
 * Retrieve the current battle state machine instance.
 *
 * @returns {import('./stateMachine.js').BattleStateMachine|null} Current instance.
 */
export function getBattleStateMachine() {
  return machine;
}

/**
 * Initialize the classic battle orchestrator.
 *
 * @param {object} store - Shared battle store.
 * @param {Function} startRoundWrapper - Optional wrapper for starting a round.
 * @param {object} [opts] - Optional overrides.
 * @param {Function} [opts.resetGame] - Custom reset handler.
 * @param {Function} [opts.startRound] - Custom round start handler.
 * @returns {Promise<void>} Resolves when setup completes.
 */
export async function initClassicBattleOrchestrator(store, startRoundWrapper, opts = {}) {
  const { resetGame: resetGameOpt, startRound: startRoundOpt } = opts;
  const doResetGame = typeof resetGameOpt === "function" ? resetGameOpt : resetGameLocal;
  const doStartRound = typeof startRoundOpt === "function" ? startRoundOpt : startRoundLocal;
  const context = { store, doResetGame, doStartRound, startRoundWrapper };
  const onEnter = {
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

  const onTransition = async ({ from, to, event }) => {
    try {
      if (typeof window !== "undefined") {
        window.__classicBattleState = to;
        if (from) window.__classicBattlePrevState = from;
        if (event) window.__classicBattleLastEvent = event;
        const entry = { from: from || null, to, event: event || null, ts: Date.now() };
        const log = Array.isArray(window.__classicBattleStateLog)
          ? window.__classicBattleStateLog
          : [];
        log.push(entry);
        while (log.length > 20) log.shift();
        window.__classicBattleStateLog = log;
        let el = document.getElementById("machine-state");
        if (!el) {
          el = document.createElement("div");
          el.id = "machine-state";
          el.style.display = "none";
          document.body.appendChild(el);
        }
        el.textContent = to;
        if (from) el.dataset.prev = from;
        if (event) el.dataset.event = event;
        el.dataset.ts = String(entry.ts);
        try {
          const badge = document.getElementById("battle-state-badge");
          if (badge) badge.textContent = `State: ${to}`;
        } catch {}
        if (typeof window !== "undefined" && machine?.context?.engine) {
          const timerState = machine.context.engine.getTimerState();
          window.__classicBattleTimerState = timerState;
          let timerEl = document.getElementById("machine-timer");
          if (!timerEl) {
            timerEl = document.createElement("div");
            timerEl.id = "machine-timer";
            timerEl.style.display = "none";
            document.body.appendChild(timerEl);
          }
          timerEl.textContent = JSON.stringify(timerState);
          timerEl.dataset.remaining = timerState.remaining;
          timerEl.dataset.paused = timerState.paused;
        }
      }
    } catch {}
    emitBattleEvent("debugPanelUpdate");
  };

  machine = await BattleStateMachine.create(onEnter, context, onTransition);
  setMachine(machine);

  // Expose a safe getter for the running machine to avoid import cycles
  // in hot-path modules (e.g., selection handling).
  try {
    if (typeof window !== "undefined") {
      window.__getClassicBattleMachine = () => machine;
    }
  } catch {}

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (machine?.context?.engine) {
        if (document.hidden) {
          machine.context.engine.handleTabInactive();
        } else {
          machine.context.engine.handleTabActive();
        }
      }
    });
  }

  if (machine?.context?.engine) {
    machine.context.engine.onTimerDrift = (driftAmount) => {
      emitBattleEvent(
        "scoreboardShowMessage",
        `Timer drift detected: ${driftAmount}s. Timer reset.`
      );
      emitBattleEvent("debugPanelUpdate");
      machine.context.engine.handleTimerDrift(driftAmount);
    };
  }

  if (typeof window !== "undefined" && machine?.context?.engine) {
    window.injectClassicBattleError = (errorMsg) => {
      machine.context.engine.injectError(errorMsg);
      emitBattleEvent("scoreboardShowMessage", `Injected error: ${errorMsg}`);
      emitBattleEvent("debugPanelUpdate");
      machine.dispatch("interruptMatch", { reason: errorMsg });
    };
  }

  try {
    if (typeof window !== "undefined") {
      window.waitForBattleState = (stateName, timeoutMs = 10000) =>
        new Promise((resolve, reject) => {
          const deadline = Date.now() + timeoutMs;
          const tick = () => {
            try {
              if (isStateTransition(null, stateName)) return resolve(true);
              if (Date.now() > deadline) return reject(new Error("waitForBattleState timeout"));
              setTimeout(tick, 50);
            } catch {
              setTimeout(tick, 50);
            }
          };
          tick();
        });
      window.getBattleStateSnapshot = () => {
        try {
          return {
            state: window.__classicBattleState || null,
            prev: window.__classicBattlePrevState || null,
            event: window.__classicBattleLastEvent || null,
            log: Array.isArray(window.__classicBattleStateLog)
              ? window.__classicBattleStateLog.slice()
              : []
          };
        } catch {
          return { state: null, prev: null, event: null, log: [] };
        }
      };
    }
  } catch {}
  return machine;
}

/**
 * Dispatch an event to the currently running battle machine.
 * This small proxy is exported for backwards compatibility: some modules
 * import `dispatchBattleEvent` from this orchestrator file. Keep it
 * minimal and safe — if the machine isn't ready the call is a no-op.
 *
 * @param {string} eventName
 * @param {any} payload
 */
export async function dispatchBattleEvent(eventName, payload) {
  if (!machine) return;
  try {
    return await machine.dispatch(eventName, payload);
  } catch {
    // swallow to avoid cascading startup failures; higher-level code
    // can still observe via emitted events or thrown errors if needed.
    try {
      // emit a debug event so UI debug panels can show the failure
      emitBattleEvent("debugPanelUpdate");
    } catch {}
  }
}
