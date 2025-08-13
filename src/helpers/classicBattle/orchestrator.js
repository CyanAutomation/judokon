import { BattleStateMachine } from "./stateMachine.js";
import { initRoundSelectModal } from "./roundSelectModal.js";
import { resetGame, startRound } from "./roundManager.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { updateDebugPanel } from "./uiHelpers.js";

let machine = null;

export function getBattleStateMachine() {
  return machine;
}

export async function initClassicBattleOrchestrator(store, startRoundWrapper) {
  const onEnter = {
    async waitingForMatchStart(m) {
      // Reset transient UI and open lobby (round selection)
      resetGame();
      infoBar.clearMessage();
      updateDebugPanel();
      await initRoundSelectModal(() => m.dispatch("startClicked"));
    },
    async matchStart(m) {
      // Context already initialized via modal; proceed to first round immediately
      // Skip the initial cooldown and go straight to the first round
      // by dispatching "ready" twice: matchStart -> cooldown -> roundStart.
      await m.dispatch("ready");
      await m.dispatch("ready");
    },
    async cooldown() {
      // Cooldown between rounds is driven by scheduleNextRound and next-button UX.
      // No-op here; transition to roundStart occurs from the Next button handler.
    },
    async roundStart(m) {
      // Render player card, opponent remains hidden; start selection timer
      if (typeof startRoundWrapper === "function") {
        await startRoundWrapper();
      } else {
        await startRound(store);
      }
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
      }
    } catch {}
    updateDebugPanel();
  };

  machine = await BattleStateMachine.create(onEnter, { store }, onTransition);
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
    }
  } catch {}
  return machine;
}

export async function dispatchBattleEvent(eventName, payload) {
  if (machine) await machine.dispatch(eventName, payload);
}
