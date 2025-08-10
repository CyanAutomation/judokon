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

  machine = await BattleStateMachine.create(onEnter, { store });
  return machine;
}

export async function dispatchBattleEvent(eventName, payload) {
  if (machine) await machine.dispatch(eventName, payload);
}

