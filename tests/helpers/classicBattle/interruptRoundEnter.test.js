import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";
import { createTimerNodes, clearRoundMessage } from "./domUtils.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";
import { initClassicBattleTest } from "./initClassicBattle.js";
import {
  initClassicBattleOrchestrator,
  getBattleStateMachine,
  dispatchBattleEvent
} from "../../../src/helpers/classicBattle/orchestrator.js";
import { onBattleEvent, offBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { handleStatSelection } from "../../../src/helpers/classicBattle/selectionHandler.js";

setupClassicBattleHooks();

async function setupInterruptHarness(storeOverrides = {}) {
  createTimerNodes();

  const baseStore = {
    selectionMade: false,
    playerChoice: null,
    __lastSelectionMade: false,
    roundsPlayed: 1,
    ...storeOverrides
  };

  await initClassicBattleTest({ afterMock: true });

  await initClassicBattleOrchestrator({ store: baseStore });

  const machine = getBattleStateMachine();
  const activeStore = machine?.context?.store ?? baseStore;
  const transitions = [];
  const scoreboardMessages = [];
  const recordTransition = (event) => {
    if (event?.detail) transitions.push(event.detail);
  };
  const recordMessage = (event) => {
    if (event?.detail) scoreboardMessages.push(event.detail);
  };
  onBattleEvent("battleStateChange", recordTransition);
  onBattleEvent("scoreboardShowMessage", recordMessage);

  const cleanup = () => {
    offBattleEvent("battleStateChange", recordTransition);
    offBattleEvent("scoreboardShowMessage", recordMessage);
  };

  return { store: activeStore, machine, transitions, scoreboardMessages, cleanup };
}

async function dispatchEvents(sequence) {
  for (const step of sequence) {
    if (!step) continue;
    const [event, payload] = Array.isArray(step) ? step : [step, undefined];
    await dispatchBattleEvent(event, payload);
  }
}

async function advanceToPlayerActionState() {
  await dispatchEvents(["startClicked"]);
  await dispatchEvents(["ready"]);
  await dispatchEvents(["cardsRevealed"]);
}

function beginSelection(store, stat) {
  const playerStats = store?.currentPlayerJudoka?.stats ?? {};
  const opponentStats = store?.currentOpponentJudoka?.stats ?? {};
  const selectionTask = handleStatSelection(store, stat, {
    playerVal: playerStats[stat],
    opponentVal: opponentStats[stat],
    forceDirectResolution: true
  });
  const selectionAppliedPromise = selectionTask?.selectionAppliedPromise;
  const safeSelectionTask = selectionTask.catch(() => {});
  safeSelectionTask.selectionAppliedPromise = selectionAppliedPromise;
  return safeSelectionTask;
}

describe.sequential("classic battle orchestrator interrupt flows", () => {
  beforeEach(() => {
    clearRoundMessage();
  });

  afterEach(async () => {
    try {
      if (typeof vi.runOnlyPendingTimersAsync === "function") {
        await vi.runOnlyPendingTimersAsync();
      }
    } catch {}
  });

  it("restarts the round and clears selection state after an interrupt", async () => {
    const env = await setupInterruptHarness();
    const { store, transitions, scoreboardMessages, cleanup } = env;
    try {
      await advanceToPlayerActionState();

      const selectionTask = beginSelection(store, "speed");
      await (selectionTask.selectionAppliedPromise ?? Promise.resolve());

      expect(store.selectionMade).toBe(true);
      expect(store.__lastSelectionMade).toBe(true);
      expect(store.playerChoice).toBe("speed");

      await dispatchBattleEvent("interrupt", { reason: "noSelection" });

      await selectionTask;

      expect(scoreboardMessages).toContain("Round interrupted: noSelection");

      expect(store.selectionMade).toBe(false);
      expect(store.__lastSelectionMade).toBe(false);
      expect(store.playerChoice).toBeNull();

      const restartTransition = transitions.find((t) => t.event === "restartRound");
      expect(restartTransition).toEqual(
        expect.objectContaining({ from: "interruptRound", to: "cooldown" })
      );
    } finally {
      cleanup();
    }
  });

  it("returns to the lobby and resets the store when the match is interrupted", async () => {
    const env = await setupInterruptHarness({ roundsPlayed: 3 });
    const { store, transitions, scoreboardMessages, cleanup } = env;
    try {
      await advanceToPlayerActionState();

      const selectionTask = beginSelection(store, "technique");
      await (selectionTask.selectionAppliedPromise ?? Promise.resolve());

      expect(store.selectionMade).toBe(true);
      expect(store.__lastSelectionMade).toBe(true);
      expect(store.playerChoice).toBe("technique");

      await dispatchBattleEvent("interruptMatch", { reason: "fatal" });

      await selectionTask;

      expect(scoreboardMessages).toContain("Match interrupted: fatal");

      expect(store.selectionMade).toBe(false);
      expect(store.__lastSelectionMade).toBe(false);
      expect(store.playerChoice).toBeNull();

      const toLobbyTransition = transitions.find((t) => t.event === "toLobby");
      expect(toLobbyTransition).toEqual(
        expect.objectContaining({ from: "interruptMatch", to: "waitingForMatchStart" })
      );
    } finally {
      cleanup();
    }
  });
});
