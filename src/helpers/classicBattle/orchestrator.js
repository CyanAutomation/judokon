import { BattleStateMachine } from "./stateMachine.js";
import { initRoundSelectModal } from "./roundSelectModal.js";
import { resetGame as resetGameLocal, startRound as startRoundLocal } from "./roundManager.js";
import * as scoreboard from "../setupScoreboard.js";
import { getDefaultTimer } from "../timerUtils.js";
import { updateDebugPanel } from "./uiHelpers.js";
import { setupScoreboard } from "../setupScoreboard.js";

if (typeof process === "undefined" || !process.env.VITEST) {
  setupScoreboard();
}

let machine = null;

export function getBattleStateMachine() {
  return machine;
}

export async function initClassicBattleOrchestrator(
  store,
  startRoundWrapper,
  opts = {}
) {
  const { resetGame: resetGameOpt, startRound: startRoundOpt } = opts;
  const doResetGame = typeof resetGameOpt === "function" ? resetGameOpt : resetGameLocal;
  const doStartRound = typeof startRoundOpt === "function" ? startRoundOpt : startRoundLocal;
  const onEnter = {
    async waitingForMatchStart(m) {
      // Prevent duplicate badge state updates and redundant lobby resets
      // Only run if previous state was NOT waitingForMatchStart
      if (
        window.__classicBattleState === "waitingForMatchStart" &&
        window.__classicBattlePrevState === "waitingForMatchStart"
      ) {
        // If this is a true duplicate transition, skip all lobby logic and badge update
        return;
      }
      // If transitioning from matchOver, interruptMatch, or any other state, proceed
      if (typeof doResetGame === "function") doResetGame();
      scoreboard.clearMessage();
      updateDebugPanel();
      await initRoundSelectModal(() => m.dispatch("startClicked"));
    },
    async matchStart(m) {
      // Context already initialized via modal; transition to initial cooldown
      // and let the cooldown handler trigger the first round.
      await m.dispatch("ready", { initial: true });
    },
    async cooldown(m, payload) {
      // The initial cooldown shows a short countdown before the first round.
      // Subsequent cooldowns are handled by scheduleNextRound and the Next button.
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
      // Cooldown between later rounds is driven by scheduleNextRound and next-button UX.
    },
    async roundStart(m) {
      // Render player card, opponent remains hidden; start selection timer
      if (typeof startRoundWrapper === "function") await startRoundWrapper();
      else if (typeof doStartRound === "function") await doStartRound(store);
      await m.dispatch("cardsRevealed");
    },
    async waitingForPlayerAction() {
      // Prompt and timer are managed inside startRound; no additional work here
    },
    async roundDecision() {
      // SelectionHandler drives reveal + evaluate; on completion it will drive transitions
    },
    async roundOver() {
      // scheduleNextRound handles cooldown + next button enabling
    },
    async matchDecision() {
      // Summary is rendered from selectionHandler; we keep state in sync only
    },
    async matchOver() {
      // Waiting for Next Match (rematch) or Home via summary or Quit modal
    },
    async interruptRound(m, payload) {
      // Handle round interruption (e.g., quit, error, admin/test)
      scoreboard.clearMessage();
      updateDebugPanel();
      // Optionally show modal or log reason
      if (payload?.reason) {
        scoreboard.showMessage(`Round interrupted: ${payload.reason}`);
      }
      // Transition to roundModification or cooldown as needed
      if (payload?.adminTest) {
        await m.dispatch("roundModification", payload);
      } else {
        await m.dispatch("cooldown");
      }
    },
    async interruptMatch(m, payload) {
      // Handle match interruption (e.g., quit, navigation, error)
      scoreboard.clearMessage();
      updateDebugPanel();
      if (payload?.reason) {
        scoreboard.showMessage(`Match interrupted: ${payload.reason}`);
      }
      // End match and transition to matchOver
      await m.dispatch("matchOver", payload);
    },
    async roundModification(m, payload) {
      // Admin/test branch for modifying round state
      scoreboard.clearMessage();
      updateDebugPanel();
      if (payload?.modification) {
        scoreboard.showMessage(`Round modified: ${payload.modification}`);
      }
      // After modification, resume round or go to cooldown
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
        // Maintain a short ring buffer of recent transitions for debugging
        const entry = { from: from || null, to, event: event || null, ts: Date.now() };
        const log = Array.isArray(window.__classicBattleStateLog)
          ? window.__classicBattleStateLog
          : [];
        log.push(entry);
        while (log.length > 20) log.shift();
        window.__classicBattleStateLog = log;
        // Update or create a lightweight DOM mirror for tests/diagnostics
        let el = document.getElementById("machine-state");
        if (!el) {
          el = document.createElement("div");
          el.id = "machine-state";
          // Hidden by default; tests can still read text/attributes
          el.style.display = "none";
          document.body.appendChild(el);
        }
        el.textContent = to;
        if (from) el.dataset.prev = from;
        if (event) el.dataset.event = event;
        el.dataset.ts = String(entry.ts);
        // Update visible state badge when present (feature-flagged)
        try {
          const badge = document.getElementById("battle-state-badge");
          if (badge) badge.textContent = `State: ${to}`;
        } catch {}
        // Expose timer state for Playwright and unit tests
        if (typeof window !== "undefined" && machine?.context?.engine) {
          const timerState = machine.context.engine.getTimerState();
          window.__classicBattleTimerState = timerState;
          // Update or create a lightweight DOM mirror for timer state
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

  // Tab inactivity: pause/resume timer on visibility change
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

  // Timer drift: listen for drift events and handle them
  if (machine?.context?.engine) {
    machine.context.engine.onTimerDrift = (driftAmount) => {
      scoreboard.showMessage(`Timer drift detected: ${driftAmount}s. Timer reset.`);
      updateDebugPanel();
      machine.context.engine.handleTimerDrift(driftAmount);
    };
  }

  // Error injection for testing
  if (typeof window !== "undefined" && machine?.context?.engine) {
    window.injectClassicBattleError = (errorMsg) => {
      machine.context.engine.injectError(errorMsg);
      scoreboard.showMessage(`Injected error: ${errorMsg}`);
      updateDebugPanel();
      machine.dispatch("interruptMatch", { reason: errorMsg });
    };
  }

  // Expose a tiny polling helper for tests to await a specific state
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
      // Provide a snapshot getter for tests/diagnostics
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
  if (machine) await machine.dispatch(eventName, payload);
}
