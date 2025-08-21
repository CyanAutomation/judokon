import { BattleStateMachine } from "./stateMachine.js";
import { initRoundSelectModal } from "./roundSelectModal.js";
import { resetGame as resetGameLocal, startRound as startRoundLocal } from "./roundManager.js";
import * as scoreboard from "../setupScoreboard.js";
import { getDefaultTimer } from "../timerUtils.js";
import { updateDebugPanel } from "./uiHelpers.js";
import { setupScoreboard } from "../setupScoreboard.js";
import { resolveRound } from "./selectionHandler.js";

if (typeof process === "undefined" || !process.env.VITEST) {
  setupScoreboard();
}

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
  const onEnter = {
    async waitingForMatchStart(m) {
      if (
        window.__classicBattleState === "waitingForMatchStart" &&
        window.__classicBattlePrevState === "waitingForMatchStart"
      ) {
        return;
      }
      if (typeof doResetGame === "function") doResetGame();
      scoreboard.clearMessage();
      updateDebugPanel();
      await initRoundSelectModal(() => m.dispatch("startClicked"));
    },
    async matchStart(m) {
      await m.dispatch("ready", { initial: true });
    },
    async cooldown(m, payload) {
      if (payload?.initial) {
        let duration = 3;
        try {
          const val = await getDefaultTimer("matchStartTimer");
          if (typeof val === "number") duration = val;
        } catch {}
        scoreboard.startCountdown(duration, () => {
          m.dispatch("ready");
        });
      }
    },
    async roundStart(m) {
      if (typeof startRoundWrapper === "function") await startRoundWrapper();
      else if (typeof doStartRound === "function") await doStartRound(store);
      await m.dispatch("cardsRevealed");
    },
    async waitingForPlayerAction() {},
    async roundDecision(m) {
      try {
        if (typeof window !== "undefined") {
          window.__roundDecisionEnter = Date.now();
        }
      } catch {}
      updateDebugPanel();
      try {
        await resolveRound(store);
      } catch (err) {
        try {
          scoreboard.showMessage("Round error. Recovering…");
          updateDebugPanel();
          await m.dispatch("interrupt", { reason: "roundResolutionError" });
        } catch {}
      }
    },
    async roundOver() {},
    async matchDecision() {},
    async matchOver() {},
    async interruptRound(m, payload) {
      scoreboard.clearMessage();
      updateDebugPanel();
      if (payload?.reason) {
        scoreboard.showMessage(`Round interrupted: ${payload.reason}`);
      }
      if (payload?.adminTest) {
        await m.dispatch("roundModification", payload);
      } else {
        await m.dispatch("cooldown");
      }
    },
    async interruptMatch(m, payload) {
      scoreboard.clearMessage();
      updateDebugPanel();
      if (payload?.reason) {
        scoreboard.showMessage(`Match interrupted: ${payload.reason}`);
      }
      await m.dispatch("matchOver", payload);
    },
    async roundModification(m, payload) {
      scoreboard.clearMessage();
      updateDebugPanel();
      if (payload?.modification) {
        scoreboard.showMessage(`Round modified: ${payload.modification}`);
      }
      if (payload?.resumeRound) {
        await m.dispatch("roundStart");
      } else {
        await m.dispatch("cooldown");
      }
    }
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
    updateDebugPanel();
  };

  machine = await BattleStateMachine.create(onEnter, { store }, onTransition);

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
      scoreboard.showMessage(`Timer drift detected: ${driftAmount}s. Timer reset.`);
      updateDebugPanel();
      machine.context.engine.handleTimerDrift(driftAmount);
    };
  }

  if (typeof window !== "undefined" && machine?.context?.engine) {
    window.injectClassicBattleError = (errorMsg) => {
      machine.context.engine.injectError(errorMsg);
      scoreboard.showMessage(`Injected error: ${errorMsg}`);
      updateDebugPanel();
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
              if (window.__classicBattleState === stateName) return resolve(true);
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

export async function dispatchBattleEvent(eventName, payload) {
  if (!machine) return;
  await machine.dispatch(eventName, payload);
}
