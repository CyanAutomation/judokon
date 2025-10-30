import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";
import { createTimerNodes } from "./domUtils.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

setupClassicBattleHooks();

async function setupInterruptHarness(storeOverrides = {}) {
  createTimerNodes();

  const baseStore = {
    selectionMade: true,
    playerChoice: "power",
    __lastSelectionMade: true,
    roundsPlayed: 1,
    ...storeOverrides
  };

  const { initClassicBattleTest } = await import("./initClassicBattle.js");
  await initClassicBattleTest({ afterMock: true });

  const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
    "../../../src/helpers/classicBattle/orchestrator.js"
  );
  await initClassicBattleOrchestrator({ store: baseStore });

  const machine = getBattleStateMachine();
  const { onBattleEvent, offBattleEvent } = await import(
    "../../../src/helpers/classicBattle/battleEvents.js"
  );
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

  return { store: baseStore, machine, transitions, scoreboardMessages, cleanup };
}

async function dispatchSequence(machine, sequence) {
  for (const step of sequence) {
    if (!step) continue;
    const [event, payload] = Array.isArray(step) ? step : [step, undefined];
    await machine.dispatch(event, payload);
  }
}

describe.sequential("classic battle orchestrator interrupt flows", () => {
  beforeEach(() => {
    // Ensure message element is clear before each scenario
    const message = document.getElementById("round-message");
    if (message) {
      message.textContent = "";
    }
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
    const { store, machine, transitions, scoreboardMessages, cleanup } = env;
    try {
      await dispatchSequence(machine, ["matchStart", "cooldown", "roundStart", "waitingForPlayerAction"]);

      // Simulate that a selection was in progress before the interrupt.
      store.selectionMade = true;
      store.__lastSelectionMade = true;
      store.playerChoice = "speed";

      await machine.dispatch("interruptRound", { reason: "noSelection" });

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
    const { store, machine, transitions, scoreboardMessages, cleanup } = env;
    try {
      await dispatchSequence(machine, ["matchStart"]);

      store.selectionMade = true;
      store.__lastSelectionMade = true;
      store.playerChoice = "technique";

      await machine.dispatch("interruptMatch", { reason: "fatal" });

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
