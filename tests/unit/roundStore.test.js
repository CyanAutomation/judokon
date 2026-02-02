/**
 * Unit tests for RoundStore - centralized round state management
 *
 * @module tests/unit/roundStore.test.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { roundStore } from "../../src/helpers/classicBattle/roundStore.js";

// Mock battle events to avoid side effects in tests
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

describe("RoundStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    roundStore.reset();
  });

  describe("initial state", () => {
    it("should start with the initial round and waitingForMatchStart state", () => {
      const round = roundStore.getCurrentRound();
      expect(round.number).toBe(1);
      expect(round.state).toBe("waitingForMatchStart");
    });

    it("should not have ready dispatched initially", () => {
      expect(roundStore.isReadyDispatched()).toBe(false);
    });
  });

  describe("round state management", () => {
    it("should update round state and emit events", async () => {
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");

      roundStore.setRoundState("roundWait", "test");

      const round = roundStore.getCurrentRound();
      expect(round.state).toBe("roundWait");

      expect(emitBattleEvent).toHaveBeenCalledWith("roundStateChanged", {
        from: "waitingForMatchStart",
        to: "roundWait",
        event: "test"
      });
    });

    it("should set startTime when entering roundPrompt state", () => {
      const beforeTime = Date.now();
      roundStore.setRoundState("roundPrompt");
      const afterTime = Date.now();

      const round = roundStore.getCurrentRound();
      expect(round.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(round.startTime).toBeLessThanOrEqual(afterTime);
    });

    it("should not update state if same value", async () => {
      roundStore.setRoundState("roundWait");
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");

      // Reset mock to clear previous calls
      emitBattleEvent.mockClear();

      roundStore.setRoundState("roundWait");

      expect(emitBattleEvent).not.toHaveBeenCalled();
    });
  });

  describe("round number management", () => {
    it("should update round number and emit events", async () => {
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");

      roundStore.setRoundNumber(5);

      const round = roundStore.getCurrentRound();
      expect(round.number).toBe(5);

      expect(emitBattleEvent).toHaveBeenCalledWith("display.round.start", {
        roundNumber: 5
      });
    });

    it("should not update if same number", async () => {
      roundStore.setRoundNumber(3);
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
      emitBattleEvent.mockClear();

      roundStore.setRoundNumber(3);

      expect(emitBattleEvent).not.toHaveBeenCalled();
    });
  });

  describe("stat selection", () => {
    it("should emit legacy event by default when stat selected", async () => {
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
      emitBattleEvent.mockClear();

      roundStore.setSelectedStat("strength");

      const round = roundStore.getCurrentRound();
      expect(round.selectedStat).toBe("strength");

      expect(emitBattleEvent).toHaveBeenCalledWith("statSelected", { stat: "strength" });
    });

    it("should support skipping legacy event while still invoking callbacks", async () => {
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
      emitBattleEvent.mockClear();

      const callback = vi.fn();
      roundStore.onStatSelected(callback);

      roundStore.setSelectedStat("agility", { emitLegacyEvent: false });

      expect(emitBattleEvent).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith("agility");
      expect(roundStore.getCurrentRound().selectedStat).toBe("agility");
    });
  });

  describe("round outcome", () => {
    it("should set round outcome and emit events", async () => {
      const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");

      roundStore.setRoundOutcome("win");

      const round = roundStore.getCurrentRound();
      expect(round.outcome).toBe("win");

      expect(emitBattleEvent).toHaveBeenCalledWith("roundOutcome", {
        outcome: "win"
      });
    });
  });

  describe("ready dispatch tracking", () => {
    it("should track ready dispatch state", () => {
      expect(roundStore.isReadyDispatched()).toBe(false);

      roundStore.markReadyDispatched();
      expect(roundStore.isReadyDispatched()).toBe(true);

      roundStore.resetReadyDispatch();
      expect(roundStore.isReadyDispatched()).toBe(false);
    });
  });

  describe("callback subscriptions", () => {
    it("should call round state change callback", () => {
      const callback = vi.fn();
      roundStore.onRoundStateChange(callback);

      roundStore.setRoundState("roundPrompt");

      expect(callback).toHaveBeenCalledWith("roundPrompt", "waitingForMatchStart");
    });

    it("should call round number change callback", () => {
      const callback = vi.fn();
      roundStore.onRoundNumberChange(callback);

      roundStore.setRoundNumber(2);

      expect(callback).toHaveBeenCalledWith(2, 1);
    });

    it("should call stat selected callback", () => {
      const callback = vi.fn();
      roundStore.onStatSelected(callback);

      roundStore.setSelectedStat("speed");

      expect(callback).toHaveBeenCalledWith("speed");
    });

    it("should call round outcome callback", () => {
      const callback = vi.fn();
      roundStore.onRoundOutcome(callback);

      roundStore.setRoundOutcome("draw");

      expect(callback).toHaveBeenCalledWith("draw");
    });
  });

  describe("state snapshot", () => {
    it("should provide debug snapshot", () => {
      roundStore.setRoundNumber(3);
      roundStore.setRoundState("roundWait");
      roundStore.setSelectedStat("agility");
      roundStore.markReadyDispatched();

      const snapshot = roundStore.getStateSnapshot();

      expect(snapshot.currentRound.number).toBe(3);
      expect(snapshot.currentRound.state).toBe("roundWait");
      expect(snapshot.currentRound.selectedStat).toBe("agility");
      expect(snapshot.readyDispatched).toBe(true);
      expect(snapshot.transitionLog).toHaveLength(1); // state change only (round number doesn't log transitions)
    });
  });

  describe("transition logging", () => {
    it("should log state transitions", () => {
      roundStore.setRoundState("roundWait", "test-event");

      const snapshot = roundStore.getStateSnapshot();
      expect(snapshot.transitionLog).toHaveLength(1);
      expect(snapshot.transitionLog[0]).toEqual({
        from: "waitingForMatchStart",
        to: "roundWait",
        event: "test-event",
        ts: expect.any(Number)
      });
    });

    it("should limit transition log to 20 entries", () => {
      // Create 25 transitions
      for (let i = 0; i < 25; i++) {
        roundStore.setRoundState(`state${i}`);
      }

      const snapshot = roundStore.getStateSnapshot();
      expect(snapshot.transitionLog).toHaveLength(20);
      // Should keep most recent entries
      expect(snapshot.transitionLog[0].to).toBe("state5");
      expect(snapshot.transitionLog[19].to).toBe("state24");
    });
  });
});
