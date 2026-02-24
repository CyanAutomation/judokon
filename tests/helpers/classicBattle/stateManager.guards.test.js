import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import {
  CLASSIC_BATTLE_STATES,
  buildClassicBattleStateTable
} from "../../../src/helpers/classicBattle/stateTable.js";
import "./commonMocks.js";

/**
 * Test suite for state manager guard conditions.
 *
 * This suite verifies that the state machine properly evaluates guard conditions
 * for state transitions, particularly the WIN_CONDITION_MET guard that checks
 * if either player has reached the match win target.
 *
 * @pseudocode
 * 2. Test internal round modification guard behavior.
 * 3. Test WIN_CONDITION_MET guard with various score scenarios.
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
    delete globalThis.__JUDOKON_ALLOW_INTERNAL_ROUND_MODIFICATION__;
  });

  describe("WIN_CONDITION_MET guard", () => {
    it("should pass WIN_CONDITION_MET guard when playerScore >= pointsToWin", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 3, opponentScore: 1 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Manually dispatch to roundDisplay state where the guard is used
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");

      // Transition through roundResolve to roundDisplay
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // Now test the WIN_CONDITION_MET guard for matchPointReached event
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should pass WIN_CONDITION_MET guard when opponentScore >= pointsToWin", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 1, opponentScore: 5 }),
        pointsToWin: 5
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winOpponent");

      expect(machine.getState()).toBe("roundDisplay");

      // WIN_CONDITION_MET should pass (opponent at 5, pointsToWin = 5)
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should fail WIN_CONDITION_MET guard when neither player has reached pointsToWin", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 2, opponentScore: 1 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // WIN_CONDITION_MET should fail (playerScore 2 < 3, opponentScore 1 < 3)
      // continue should still route through matchEvaluate and return to roundWait
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");
    });

    it("should handle WIN_CONDITION_MET guard with equal scores below target", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 2, opponentScore: 2 }),
        pointsToWin: 5
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=draw");

      expect(machine.getState()).toBe("roundDisplay");

      // Both at 2, pointsToWin = 5, so guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");
    });

    it("should handle WIN_CONDITION_MET guard with edge case (score exactly at target)", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 10, opponentScore: 5 }),
        pointsToWin: 10
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // playerScore exactly equals pointsToWin, guard should pass
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should handle WIN_CONDITION_MET guard with high scores", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 1000, opponentScore: 500 }),
        pointsToWin: 100
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // playerScore 1000 >= pointsToWin 100, guard should pass
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });

    it("should handle missing engine gracefully (WIN_CONDITION_MET guard fails)", async () => {
      context = { engine: null };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // With missing engine, WIN_CONDITION_MET guard should fail
      // So continue should work instead
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");
    });

    it("should handle missing getScores method gracefully", async () => {
      const mockEngine = {
        // Missing getScores method
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // With missing getScores, guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");
    });

    it("should handle missing pointsToWin gracefully", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 3, opponentScore: 1 })
        // Missing pointsToWin
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // With missing pointsToWin, guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");
    });

    it("should evaluate WIN_CONDITION_MET with zero pointsToWin (edge case)", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 1, opponentScore: 0 }),
        pointsToWin: 0
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // With pointsToWin = 0, any positive score satisfies the condition
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("matchDecision");
    });
  });

  describe("context-driven core transition behavior", () => {
    it("routes timeout to roundResolve with autoSelect flag enabled", async () => {
      context = { flags: { autoSelect: true } };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      const result = await machine.dispatch("timeout");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("roundResolve");

      expect(machine.getState()).toBe("roundResolve");
    });

    it("routes timeout to roundResolve with autoSelect flag disabled", async () => {
      context = { flags: { autoSelect: false } };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      const result = await machine.dispatch("timeout");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("roundResolve");
    });

    it("should allow roundModifyFlag branch when internal overlay config and runtime guard are enabled", async () => {
      context = { internalConfig: { enableRoundModificationOverlay: true } };
      globalThis.__JUDOKON_ALLOW_INTERNAL_ROUND_MODIFICATION__ = true;
      machine = await createStateManager(
        {},
        context,
        undefined,
        buildClassicBattleStateTable({ includeRoundModification: true })
      );

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

    it("should block roundModifyFlag when runtime guard is not enabled", async () => {
      context = { internalConfig: { enableRoundModificationOverlay: true } };
      machine = await createStateManager(
        {},
        context,
        undefined,
        buildClassicBattleStateTable({ includeRoundModification: true })
      );

      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");

      await machine.dispatch("interrupt");
      expect(machine.getState()).toBe("interruptRound");

      const result = await machine.dispatch("roundModifyFlag");
      expect(result).toBe(false);
      expect(machine.getState()).toBe("interruptRound");
    });

    it("keeps core timeout transition identical with flags enabled or disabled", async () => {
      const resolveTimeoutSequence = async (flags) => {
        const transitions = [];
        const trackedMachine = await createStateManager(
          {},
          { flags },
          ({ from, to, event }) => transitions.push({ from, to, event }),
          CLASSIC_BATTLE_STATES
        );

        await trackedMachine.dispatch("startClicked");
        await trackedMachine.dispatch("ready");
        await trackedMachine.dispatch("ready");
        await trackedMachine.dispatch("cardsRevealed");
        await trackedMachine.dispatch("timeout");

        return transitions
          .filter((entry) => entry.from && entry.event !== "init")
          .map((entry) => `${entry.from}->${entry.to}:${entry.event}`);
      };

      const enabledSequence = await resolveTimeoutSequence({ autoSelect: true });
      const disabledSequence = await resolveTimeoutSequence({ autoSelect: false });

      expect(enabledSequence).toEqual(disabledSequence);
      expect(enabledSequence).toContain("roundSelect->roundResolve:timeout");
    });
  });

  describe("internal round modification guard", () => {
    it("should handle internal round modification guard declaration", async () => {
      // This test verifies the guard mechanism works for admin flags
      // Actual feature flag behavior is tested elsewhere
      context = {};
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      expect(machine.getState()).toBe("waitingForMatchStart");
      // The internal guard is tested via roundModifyFlag event in interruptRound state
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

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // With no engine, guard should fail
      const continueResult = await machine.dispatch("continue");
      expect(continueResult).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");
    });
  });

  describe("matchPointReached -> matchDecision transition", () => {
    it("should transition from roundDisplay to matchDecision when WIN_CONDITION_MET passes", async () => {
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

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // Dispatch matchPointReached - should transition through matchEvaluate to matchDecision
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("matchDecision");

      // Verify transition was recorded
      const toMatchEvaluate = onTransitionSpy.find(
        (t) => t.from === "roundDisplay" && t.to === "matchEvaluate"
      );
      expect(toMatchEvaluate).toBeDefined();
      expect(toMatchEvaluate.event).toBe("matchPointReached");

      const toMatchDecision = onTransitionSpy.find(
        (t) => t.from === "matchEvaluate" && t.to === "matchDecision"
      );
      expect(toMatchDecision).toBeDefined();
      expect(toMatchDecision.event).toBe("evaluateMatch");
    });

    it("should not transition from roundDisplay to matchDecision when WIN_CONDITION_MET fails", async () => {
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

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=winPlayer");

      expect(machine.getState()).toBe("roundDisplay");

      // Dispatch matchPointReached - should route through matchEvaluate and return to roundWait
      const result = await machine.dispatch("matchPointReached");
      expect(result).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");

      const toMatchDecision = onTransitionSpy.find(
        (t) => t.from === "matchEvaluate" && t.to === "matchDecision"
      );
      expect(toMatchDecision).toBeUndefined();
    });

    it("should fall back to roundWait when matchPointReached evaluates false", async () => {
      const mockEngine = {
        getScores: () => ({ playerScore: 2, opponentScore: 2 }),
        pointsToWin: 3
      };

      context = { engine: mockEngine };
      machine = await createStateManager({}, context, undefined, CLASSIC_BATTLE_STATES);

      // Navigate to roundDisplay state
      await machine.dispatch("startClicked");
      await machine.dispatch("ready");
      await machine.dispatch("ready");
      await machine.dispatch("cardsRevealed");
      await machine.dispatch("statSelected");
      await machine.dispatch("outcome=draw");

      expect(machine.getState()).toBe("roundDisplay");

      // matchPointReached should evaluate false and return to roundWait
      const pointResult = await machine.dispatch("matchPointReached");
      expect(pointResult).toBe(true);
      expect(machine.getState()).toBe("matchEvaluate");
      const evaluateResult = await machine.dispatch("evaluateMatch");
      expect(evaluateResult).toBe(true);
      expect(machine.getState()).toBe("roundWait");
    });
  });
});
