/**
 * Unit tests for Battle CLI test support utilities.
 *
 * Tests the normalizeRoundDetailForTest and resolveRoundForTest functions
 * that enable deterministic round resolution in Battle CLI integration tests.
 *
 * @file tests/utils/battleCliTestSupport.test.js
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeRoundDetailForTest,
  resolveRoundForTest
} from "../../src/pages/battleCLI/testSupport.js";

describe("normalizeRoundDetailForTest", () => {
  describe("Event-like input normalization", () => {
    it("should extract detail from event-like object", () => {
      const eventLike = {
        detail: {
          result: { message: "Player wins", playerScore: 5, opponentScore: 3 }
        }
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.message).toBe("Player wins");
      expect(result.result.playerScore).toBe(5);
      expect(result.result.opponentScore).toBe(3);
    });

    it("should use direct object when detail is missing", () => {
      const eventLike = {
        result: { message: "Draw", playerScore: 5, opponentScore: 5 }
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.message).toBe("Draw");
      expect(result.result.playerScore).toBe(5);
      expect(result.result.opponentScore).toBe(5);
    });

    it("should handle undefined input gracefully", () => {
      const result = normalizeRoundDetailForTest(undefined);

      expect(result.result).toBeDefined();
      expect(result.result.message).toBe("");
      expect(result.result.playerScore).toBe(0);
      expect(result.result.opponentScore).toBe(0);
    });

    it("should handle null input gracefully", () => {
      const result = normalizeRoundDetailForTest(null);

      expect(result.result).toBeDefined();
      expect(result.result.message).toBe("");
      expect(result.result.playerScore).toBe(0);
      expect(result.result.opponentScore).toBe(0);
    });

    it("should handle empty object input", () => {
      const result = normalizeRoundDetailForTest({});

      expect(result.result).toBeDefined();
      expect(result.result.message).toBe("");
      expect(result.result.playerScore).toBe(0);
      expect(result.result.opponentScore).toBe(0);
    });
  });

  describe("Score coercion", () => {
    it("should coerce string scores to numbers", () => {
      const eventLike = {
        result: { playerScore: "7", opponentScore: "4" }
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.playerScore).toBe(7);
      expect(result.result.opponentScore).toBe(4);
    });

    it("should use fallback fields for scores", () => {
      const eventLike = {
        playerScore: 8,
        opponentScore: 6
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.playerScore).toBe(8);
      expect(result.result.opponentScore).toBe(6);
    });

    it("should use resultPlayerScore/resultOpponentScore as fallback", () => {
      const eventLike = {
        resultPlayerScore: 9,
        resultOpponentScore: 7
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.playerScore).toBe(9);
      expect(result.result.opponentScore).toBe(7);
    });

    it("should prefer result object scores over fallback fields", () => {
      const eventLike = {
        result: { playerScore: 10, opponentScore: 8 },
        playerScore: 5,
        opponentScore: 3,
        resultPlayerScore: 7,
        resultOpponentScore: 4
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.playerScore).toBe(10);
      expect(result.result.opponentScore).toBe(8);
    });

    it("should default to 0 for invalid scores", () => {
      const eventLike = {
        result: { playerScore: NaN, opponentScore: undefined }
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.playerScore).toBe(0);
      expect(result.result.opponentScore).toBe(0);
    });

    it("should handle Infinity scores", () => {
      const eventLike = {
        result: { playerScore: Infinity, opponentScore: -Infinity }
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.playerScore).toBe(0);
      expect(result.result.opponentScore).toBe(0);
    });
  });

  describe("Message field normalization", () => {
    it("should extract message from result object", () => {
      const eventLike = {
        result: { message: "Technique wins!" }
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.message).toBe("Technique wins!");
    });

    it("should use resultMessage as fallback", () => {
      const eventLike = {
        resultMessage: "Speed advantage"
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.message).toBe("Speed advantage");
    });

    it("should use message field as final fallback", () => {
      const eventLike = {
        message: "Power dominates"
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.message).toBe("Power dominates");
    });

    it("should prefer result.message over other message fields", () => {
      const eventLike = {
        result: { message: "Primary" },
        resultMessage: "Secondary",
        message: "Tertiary"
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.message).toBe("Primary");
    });

    it("should default to empty string when message is missing", () => {
      const result = normalizeRoundDetailForTest({});

      expect(result.result.message).toBe("");
    });
  });

  describe("Store attachment", () => {
    it("should attach store from options when detail lacks store", () => {
      const mockStore = { state: "test" };
      const eventLike = {};

      const result = normalizeRoundDetailForTest(eventLike, { store: mockStore });

      expect(result.store).toBe(mockStore);
    });

    it("should use getStore function when store not provided", () => {
      const mockStore = { state: "lazy" };
      const getStore = vi.fn(() => mockStore);
      const eventLike = {};

      const result = normalizeRoundDetailForTest(eventLike, { getStore });

      expect(getStore).toHaveBeenCalled();
      expect(result.store).toBe(mockStore);
    });

    it("should prefer detail.store over options.store", () => {
      const detailStore = { state: "detail" };
      const optionsStore = { state: "options" };
      const eventLike = {
        detail: { store: detailStore }
      };

      const result = normalizeRoundDetailForTest(eventLike, { store: optionsStore });

      expect(result.store).toBe(detailStore);
    });

    it("should not attach store when both detail and options lack store", () => {
      const result = normalizeRoundDetailForTest({}, {});

      expect(result.store).toBeUndefined();
    });

    it("should prefer store over getStore when both provided", () => {
      const mockStore = { state: "direct" };
      const getStore = vi.fn(() => ({ state: "lazy" }));

      const result = normalizeRoundDetailForTest({}, { store: mockStore, getStore });

      expect(getStore).not.toHaveBeenCalled();
      expect(result.store).toBe(mockStore);
    });
  });

  describe("Edge cases", () => {
    it("should handle null detail in event-like object", () => {
      const eventLike = { detail: null };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result).toBeDefined();
      expect(result.result.message).toBe("");
    });

    it("should preserve extra fields in result object", () => {
      const eventLike = {
        result: {
          message: "Test",
          playerScore: 5,
          opponentScore: 3,
          customField: "preserved"
        }
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.customField).toBe("preserved");
    });

    it("should handle non-object result gracefully", () => {
      const eventLike = {
        result: "not an object"
      };

      const result = normalizeRoundDetailForTest(eventLike);

      expect(result.result.message).toBe("");
      expect(result.result.playerScore).toBe(0);
      expect(result.result.opponentScore).toBe(0);
    });
  });
});

describe("resolveRoundForTest", () => {
  let mockDispatch;
  let mockEmit;
  let mockEmitOpponentReveal;
  let mockGetStore;

  beforeEach(() => {
    mockDispatch = vi.fn().mockResolvedValue(true);
    mockEmit = vi.fn();
    mockEmitOpponentReveal = vi.fn().mockResolvedValue(undefined);
    mockGetStore = vi.fn(() => ({ state: "test" }));

    // Mock document for opponent card tests
    if (typeof document !== "undefined") {
      const mockCard = document.createElement("div");
      mockCard.id = "opponent-card";
      mockCard.classList.add("opponent-hidden");
      vi.spyOn(document, "getElementById").mockReturnValue(mockCard);
    }
  });

  describe("Basic resolution flow", () => {
    it("should normalize detail and call all provided functions", async () => {
      const eventLike = {
        result: { message: "Test", playerScore: 5, opponentScore: 3 }
      };

      const result = await resolveRoundForTest(eventLike, {
        dispatch: mockDispatch,
        emit: mockEmit,
        emitOpponentReveal: mockEmitOpponentReveal
      });

      expect(result.detail.result.message).toBe("Test");
      expect(result.dispatched).toBe(true);
      expect(result.emitted).toBe(true);
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalled();
      expect(mockEmitOpponentReveal).toHaveBeenCalled();
    });

    it("should return detail even when no handlers provided", async () => {
      const eventLike = {
        result: { message: "Test", playerScore: 5, opponentScore: 3 }
      };

      const result = await resolveRoundForTest(eventLike, {});

      expect(result.detail.result.message).toBe("Test");
      expect(result.dispatched).toBe(false);
      expect(result.emitted).toBe(false);
    });

    it("should handle undefined options", async () => {
      const result = await resolveRoundForTest({}, undefined);

      expect(result.detail).toBeDefined();
      expect(result.dispatched).toBe(false);
      expect(result.emitted).toBe(false);
    });

    it("should handle empty options object", async () => {
      const result = await resolveRoundForTest({});

      expect(result.detail).toBeDefined();
      expect(result.dispatched).toBe(false);
      expect(result.emitted).toBe(false);
    });
  });

  describe("Dispatch handling", () => {
    it("should set dispatched to true when dispatch succeeds", async () => {
      mockDispatch.mockResolvedValue(true);

      const result = await resolveRoundForTest({}, { dispatch: mockDispatch });

      expect(result.dispatched).toBe(true);
      expect(mockDispatch).toHaveBeenCalledOnce();
    });

    it("should set dispatched to false when dispatch returns false", async () => {
      mockDispatch.mockResolvedValue(false);

      const result = await resolveRoundForTest({}, { dispatch: mockDispatch });

      expect(result.dispatched).toBe(false);
      expect(mockDispatch).toHaveBeenCalledOnce();
    });

    it("should set dispatched to false when dispatch throws error", async () => {
      mockDispatch.mockRejectedValue(new Error("Dispatch error"));

      const result = await resolveRoundForTest({}, { dispatch: mockDispatch });

      expect(result.dispatched).toBe(false);
      expect(mockDispatch).toHaveBeenCalledOnce();
    });

    it("should not call dispatch when not provided", async () => {
      const result = await resolveRoundForTest({}, {});

      expect(result.dispatched).toBe(false);
    });

    it("should ignore non-function dispatch", async () => {
      const result = await resolveRoundForTest({}, { dispatch: "not a function" });

      expect(result.dispatched).toBe(false);
    });
  });

  describe("Emit handling", () => {
    it("should set emitted to true when emit succeeds", async () => {
      const result = await resolveRoundForTest({}, { emit: mockEmit });

      expect(result.emitted).toBe(true);
      expect(mockEmit).toHaveBeenCalledOnce();
    });

    it("should set emitted to false when emit throws error", async () => {
      mockEmit.mockImplementation(() => {
        throw new Error("Emit error");
      });

      const result = await resolveRoundForTest({}, { emit: mockEmit });

      expect(result.emitted).toBe(false);
      expect(mockEmit).toHaveBeenCalledOnce();
    });

    it("should not call emit when not provided", async () => {
      const result = await resolveRoundForTest({}, {});

      expect(result.emitted).toBe(false);
    });

    it("should ignore non-function emit", async () => {
      const result = await resolveRoundForTest({}, { emit: "not a function" });

      expect(result.emitted).toBe(false);
    });
  });

  describe("Opponent reveal handling", () => {
    it("should call emitOpponentReveal when provided", async () => {
      const result = await resolveRoundForTest({}, { emitOpponentReveal: mockEmitOpponentReveal });

      expect(mockEmitOpponentReveal).toHaveBeenCalledOnce();
      expect(result.detail).toBeDefined();
    });

    it("should continue execution when emitOpponentReveal throws error", async () => {
      mockEmitOpponentReveal.mockRejectedValue(new Error("Reveal error"));

      const result = await resolveRoundForTest({}, {
        emitOpponentReveal: mockEmitOpponentReveal,
        dispatch: mockDispatch
      });

      expect(mockEmitOpponentReveal).toHaveBeenCalledOnce();
      expect(result.dispatched).toBe(true);
    });

    it("should not call emitOpponentReveal when not provided", async () => {
      await resolveRoundForTest({}, {});

      // No error should be thrown
    });

    it("should ignore non-function emitOpponentReveal", async () => {
      const result = await resolveRoundForTest({}, { emitOpponentReveal: "not a function" });

      expect(result.detail).toBeDefined();
    });
  });

  describe("Store integration", () => {
    it("should pass store from options to normalized detail", async () => {
      const mockStore = { state: "test" };

      const result = await resolveRoundForTest({}, { store: mockStore, dispatch: mockDispatch });

      expect(result.detail.store).toBe(mockStore);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ store: mockStore })
      );
    });

    it("should use getStore when store not provided", async () => {
      const result = await resolveRoundForTest({}, { getStore: mockGetStore, dispatch: mockDispatch });

      expect(mockGetStore).toHaveBeenCalled();
      expect(result.detail.store).toBeDefined();
    });
  });

  describe("Error resilience", () => {
    it("should complete even when all handlers throw errors", async () => {
      mockDispatch.mockRejectedValue(new Error("Dispatch error"));
      mockEmit.mockImplementation(() => {
        throw new Error("Emit error");
      });
      mockEmitOpponentReveal.mockRejectedValue(new Error("Reveal error"));

      const result = await resolveRoundForTest({}, {
        dispatch: mockDispatch,
        emit: mockEmit,
        emitOpponentReveal: mockEmitOpponentReveal
      });

      expect(result.detail).toBeDefined();
      expect(result.dispatched).toBe(false);
      expect(result.emitted).toBe(false);
    });

    it("should handle async dispatch rejection gracefully", async () => {
      mockDispatch.mockRejectedValue(new Error("Async error"));

      const result = await resolveRoundForTest({}, { dispatch: mockDispatch });

      expect(result.dispatched).toBe(false);
    });
  });

  describe("Execution order", () => {
    it("should execute handlers in correct order: reveal, dispatch, emit", async () => {
      const callOrder = [];

      mockEmitOpponentReveal.mockImplementation(async () => {
        callOrder.push("reveal");
      });
      mockDispatch.mockImplementation(async () => {
        callOrder.push("dispatch");
      });
      mockEmit.mockImplementation(() => {
        callOrder.push("emit");
      });

      await resolveRoundForTest({}, {
        emitOpponentReveal: mockEmitOpponentReveal,
        dispatch: mockDispatch,
        emit: mockEmit
      });

      expect(callOrder).toEqual(["reveal", "dispatch", "emit"]);
    });
  });
});
