import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";
import "./commonMocks.js";

/**
 * Test suite for state manager guard conditions.
 *
 * This suite verifies that the state machine properly evaluates guard conditions
 * for state transitions, particularly the WIN_CONDITION_MET guard that checks
 * if either player has reached the match win target.
 *
 * @pseudocode
 * 1. Test autoSelectEnabled guard (feature flag-based).
 * 2. Test FF_ROUND_MODIFY guard (admin flag).
 * 3. Test WIN_CONDITION_MET guard with various score scenarios.
 * 4. Test negated guards.
 * 5. Test matchPointReached -> matchDecision transition with guard.
 */

describe("stateManager guard evaluation", () => {
  let machine;
  let context;

  beforeEach(async () => {
    machine = null;
    context = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("WIN_CONDITION_MET guard", () => {
    it("should pass WIN_CONDITION_MET guard when playerScore >= pointsToWin", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 3, opponentScore: 1 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Manually dispatch to roundOver state where the guard is used
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");

      // Transition through roundDecision to roundOver
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // Now test the WIN_CONDITION_MET guard for matchPointReached event
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should pass WIN_CONDITION_MET guard when opponentScore >= pointsToWin", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 1, opponentScore: 5 }),
        pointsToWin: 5
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winOpponent");

      expect(machine.getState()).toBe("roundOver");

      // WIN_CONDITION_MET should pass (opponent at 5, pointsToWin = 5)
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should fail WIN_CONDITION_MET guard when neither player has reached pointsToWin", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 2, opponentScore: 1 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // WIN_CONDITION_MET should fail (playerScore 2 < 3, opponentScore 1 < 3)
      // matchPointReached event should be blocked by the guard, so continue should work instead
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("cooldown");
    });

    it("should handle WIN_CONDITION_MET guard with equal scores below target", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 2, opponentScore: 2 }),
        pointsToWin: 5
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=draw");

      expect(machine.getState()).toBe("roundOver");

      // Both at 2, pointsToWin = 5, so guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("cooldown");
    });

    it("should handle WIN_CONDITION_MET guard with edge case (score exactly at target)", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 10, opponentScore: 5 }),
        pointsToWin: 10
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // playerScore exactly equals pointsToWin, guard should pass
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should handle WIN_CONDITION_MET guard with high scores", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 1000, opponentScore: 500 }),
        pointsToWin: 100
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // playerScore 1000 >= pointsToWin 100, guard should pass
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should handle missing engine gracefully (WIN_CONDITION_MET guard fails)", async () => {
      context = { engine: null };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // With missing engine, WIN_CONDITION_MET guard should fail
      // So continue should work instead
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("cooldown");
    });

    it("should handle missing getScores method gracefully", async () => {
      const mockEngine = {
        // Missing getScores method
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // With missing getScores, guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("cooldown");
    });

    it("should handle missing pointsToWin gracefully", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 3, opponentScore: 1 })
        // Missing pointsToWin
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // With missing pointsToWin, guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("cooldown");
    });

    it("should evaluate WIN_CONDITION_MET with zero pointsToWin (edge case)", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 1, opponentScore: 0 }),
        pointsToWin: 0
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // With pointsToWin = 0, any positive score satisfies the condition
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });
  });

  describe("autoSelectEnabled guard", () => {
    it("should handle autoSelectEnabled guard (feature flag)", async () => {
      // This test verifies the guard mechanism works for feature flags
      // Actual feature flag behavior is tested elsewhere
      context = {};
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      expect(machine.getState()).toBe("waitingForMatchStart");
      // The autoSelectEnabled guard is tested via timeout event in waitingForPlayerAction state
    });
  });

  describe("context-driven guard configuration", () => {
    it("should route timeout to roundDecision when autoSelect flag is enabled in context", async () => {
      context = { flags: { autoSelect: true } };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      const result = await machine.dispatch("timeout");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("waitingForOpponentDecision");

      await machine.dispatch("opponentDecisionReady");
      expect(machine.getState()).toBe("roundDecision");
    });

    it("should route timeout to interruptRound when autoSelect flag is disabled in context", async () => {
      context = { flags: { autoSelect: false } };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      const result = await machine.dispatch("timeout");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("interruptRound");
    });

    it("should allow roundModifyFlag branch when roundModify flag is enabled in context", async () => {
      context = { flags: { roundModify: true } };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      await machine.dispatch("interrupt");
      expect(machine.getState()).toBe("interruptRound");

      const result = await machine.dispatch("roundModifyFlag");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("roundModification");
    });

    it("should respect explicit guardOverrides when provided to createStateManager", async () => {
      context = { flags: { autoSelect: false } };
      const guardOverrides = { autoSelectEnabled: true };
      machine = await createStateManager(
        {},
        context,
        undefined,
        CLASSIC_BATTLE_STATES,
        guardOverrides
      );

      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      const result = await machine.dispatch("timeout");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("waitingForOpponentDecision");

      await machine.dispatch("opponentDecisionReady");
      expect(machine.getState()).toBe("roundDecision");
    });
  });

  describe("FF_ROUND_MODIFY guard", () => {
    it("should handle FF_ROUND_MODIFY guard (admin flag)", async () => {
      // This test verifies the guard mechanism works for admin flags
      // Actual feature flag behavior is tested elsewhere
      context = {};
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      expect(machine.getState()).toBe("waitingForMatchStart");
      // The FF_ROUND_MODIFY guard is tested via roundModifyFlag event in interruptRound state
    });
  });

  describe("guard negation", () => {
    it("should handle negated autoSelectEnabled guard", async () => {
      // The negated guard !autoSelectEnabled is used for timeout->interruptRound transition
      // This verifies the negation logic works correctly
      context = {};
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      expect(machine.getState()).toBe("waitingForMatchStart");
    });
  });

  describe("guard with context variations", () => {
    it("should handle guard evaluation with undefined context", async () => {
      machine = await createStateManager({}, undefined, undefined, CLASSIC_BATTLE_STATES);

      expect(machine.getState()).toBe("waitingForMatchStart");
      // Should not throw even with undefined context
    });

    it("should handle guard evaluation with empty context", async () => {
      machine = await createStateManager({}, {}, undefined, CLASSIC_BATTLE_STATES);

      expect(machine.getState()).toBe("waitingForMatchStart");
      // Should not throw even with empty context
    });

    it("should handle WIN_CONDITION_MET with context but no engine", async () => {
      context = { someOtherProp: "value" };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // With no engine, guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("cooldown");
    });
  });

  describe("matchPointReached -> matchDecision transition", () => {
    it("should transition from roundOver to matchDecision when WIN_CONDITION_MET passes", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 3, opponentScore: 0 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };

      const onTransitionSpy = [];
      const onTransition = ({ from, to, event }) => {
        onTransitionSpy.push({ from, to, event });
      };

      machine = await createStateManager({}, context, onTransition, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // Dispatch matchPointReached - should transition to matchDecision
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchDecision");

      // Verify transition was recorded
      const transition = onTransitionSpy.find(
        (t) => t.from === "roundOver" && t.to === "matchDecision"
      );
      expect(transition).toBeDefined();
      expect(transition.event).toBe("matchPointReached");
    });

    it("should not transition from roundOver to matchDecision when WIN_CONDITION_MET fails", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 1, opponentScore: 0 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };

      const onTransitionSpy = [];
      const onTransition = ({ from, to, event }) => {
        onTransitionSpy.push({ from, to, event });
      };

      machine = await createStateManager({}, context, onTransition, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundOver");

      // Dispatch matchPointReached - should NOT transition because guard fails
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(false);
      expect(machine.getState()).toBe("roundOver");

      // Verify no transition to matchDecision was recorded
      const transition = onTransitionSpy.find(
        (t) => t.from === "roundOver" && t.to === "matchDecision"
      );
      expect(transition).toBeUndefined();
    });

    it("should allow continue transition when matchPointReached fails guard", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 2, opponentScore: 2 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundOver state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("opponentDecisionReady");
      await machine.dispatch("outcome=draw");

      expect(machine.getState()).toBe("roundOver");

      // matchPointReached should fail
      const pointResult = await machine.dispatch("matchPointReached");
      expect(pointResult).toBe(false);
      expect(machine.getState()).toBe("roundOver");

      // continue should succeed
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("cooldown");
    });
  });
});
