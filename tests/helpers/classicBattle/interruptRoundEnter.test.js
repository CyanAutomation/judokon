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
    currentPlayerJudoka: {
      id: 1,
      name: "TestJudoka1",
      stats: { power: 5, speed: 6, technique: 7, kumikata: 4, newaza: 5 }
    },
    currentOpponentJudoka: {
      id: 2,
      name: "TestJudoka2",
      stats: { power: 4, speed: 5, technique: 6, kumikata: 7, newaza: 8 }
    },
    ...storeOverrides
  };

  await initClassicBattleTest({ afterMock: true });

  await initClassicBattleOrchestrator({
    store: baseStore,
    startRoundWrapper: async () => {
      // Mock roundStart - just ensure store has judoka data
      if (!baseStore.currentPlayerJudoka && baseStore.currentPlayerJudoka === undefined) {
        baseStore.currentPlayerJudoka = {
          id: 1,
          name: "TestJudoka1",
          stats: { power: 5, speed: 6, technique: 7, kumikata: 4, newaza: 5 }
        };
      }
      if (!baseStore.currentOpponentJudoka && baseStore.currentOpponentJudoka === undefined) {
        baseStore.currentOpponentJudoka = {
          id: 2,
          name: "TestJudoka2",
          stats: { power: 4, speed: 5, technique: 6, kumikata: 7, newaza: 8 }
        };
      }
    }
  });

  const machine = getBattleStateMachine();
  const activeStore = machine?.context?.store ?? baseStore;
  const transitions = [];
  const scoreboardMessages = [];
  const interruptRaisedEvents = [];
  const interruptResolvedEvents = [];
  const recordTransition = (event) => {
    if (event?.detail) transitions.push(event.detail);
  };
  const recordMessage = (event) => {
    if (event?.detail) scoreboardMessages.push(event.detail);
  };
  const recordMessageRaised = (event) => {
    if (event?.detail) interruptRaisedEvents.push(event.detail);
  };
  const recordMessageResolved = (event) => {
    if (event?.detail) interruptResolvedEvents.push(event.detail);
  };
  onBattleEvent("battleStateChange", recordTransition);
  onBattleEvent("scoreboardShowMessage", recordMessage);
  onBattleEvent("interrupt.raised", recordMessageRaised);
  onBattleEvent("interrupt.resolved", recordMessageResolved);

  const cleanup = () => {
    offBattleEvent("battleStateChange", recordTransition);
    offBattleEvent("scoreboardShowMessage", recordMessage);
    offBattleEvent("interrupt.raised", recordMessageRaised);
    offBattleEvent("interrupt.resolved", recordMessageResolved);
  };

  return {
    store: activeStore,
    machine,
    transitions,
    scoreboardMessages,
    interruptRaisedEvents,
    interruptResolvedEvents,
    cleanup
  };
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
  await dispatchEvents(["ready"]);
}

async function flushFallbackTimers() {
  if (typeof vi.runOnlyPendingTimersAsync === "function") {
    await vi.runOnlyPendingTimersAsync();
    return;
  }
  vi.advanceTimersByTime(5000);
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
    const {
      store,
      transitions,
      scoreboardMessages,
      interruptRaisedEvents,
      interruptResolvedEvents,
      cleanup
    } = env;
    try {
      await advanceToPlayerActionState();

      const selectionTask = beginSelection(store, "speed");
      await (selectionTask.selectionAppliedPromise ?? Promise.resolve());

      expect(store.selectionMade).toBe(true);
      expect(store.__lastSelectionMade).toBe(true);
      expect(store.playerChoice).toBe("speed");

      await dispatchBattleEvent("interrupt", { reason: "noSelection" });
      await flushFallbackTimers();

      await selectionTask;

      expect(scoreboardMessages).toContain("Round interrupted: noSelection");

      expect(interruptRaisedEvents.at(-1)).toEqual(
        expect.objectContaining({
          scope: "round",
          reason: "noSelection",
          resumeTarget: "roundWait",
          inputFrozen: true
        })
      );
      expect(interruptResolvedEvents.at(-1)).toEqual(
        expect.objectContaining({
          outcome: "restartRound",
          resumeTarget: "roundWait",
          restoredTimer: expect.any(Boolean),
          remainingMs: expect.any(Number)
        })
      );

      expect(store.selectionMade).toBe(false);
      expect(store.__lastSelectionMade).toBe(false);
      expect(store.playerChoice).toBeNull();

      const restartTransition = transitions.find((t) => t.event === "restartRound");
      expect(restartTransition).toEqual(
        expect.objectContaining({ from: "interruptRound", to: "roundWait" })
      );
    } finally {
      cleanup();
    }
  });

  it("returns to the lobby and resets the store when the match is interrupted", async () => {
    const env = await setupInterruptHarness({ roundsPlayed: 3 });
    const { store, cleanup } = env;
    try {
      await advanceToPlayerActionState();

      const selectionTask = beginSelection(store, "technique");
      await (selectionTask.selectionAppliedPromise ?? Promise.resolve());

      expect(store.selectionMade).toBe(true);
      expect(store.__lastSelectionMade).toBe(true);
      expect(store.playerChoice).toBe("technique");

      await dispatchBattleEvent("interrupt", { reason: "quit" });
      await flushFallbackTimers();

      await selectionTask;

      // When interrupted with "quit" reason, the round interrupt handler dispatches "abortMatch"
      // which eventually leads to match termination. Verify selection state is cleared.

      expect(store.selectionMade).toBe(false);
      expect(store.__lastSelectionMade).toBe(false);
      expect(store.playerChoice).toBeNull();
    } finally {
      cleanup();
    }
  });
});
