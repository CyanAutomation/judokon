import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  emitBattleEvent,
  onBattleEvent,
  __resetBattleEventTarget,
  getBattleEventTarget
} from "../../../src/helpers/classicBattle/battleEvents.js";

describe("Event System Integration Validation", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
  });

  describe("Core Event System", () => {
    it("should emit and receive events correctly", () => {
      const mockHandler = vi.fn();

      onBattleEvent("testEvent", mockHandler);
      emitBattleEvent("testEvent", { test: "data" });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler.mock.calls[0][0].detail).toEqual({ test: "data" });
    });

    it("should handle multiple listeners for same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      onBattleEvent("multiEvent", handler1);
      onBattleEvent("multiEvent", handler2);
      emitBattleEvent("multiEvent", { data: "shared" });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1.mock.calls[0][0].detail).toEqual({ data: "shared" });
      expect(handler2.mock.calls[0][0].detail).toEqual({ data: "shared" });
    });

    it("should handle events without detail payload", () => {
      const mockHandler = vi.fn();

      onBattleEvent("noPayloadEvent", mockHandler);
      emitBattleEvent("noPayloadEvent");

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler.mock.calls[0][0].detail).toBeNull();
    });

    it("should have stable global event target", () => {
      const target1 = getBattleEventTarget();
      const target2 = getBattleEventTarget();

      expect(target1).toBe(target2);
      expect(target1).toBeInstanceOf(EventTarget);
    });
  });

  describe("Battle Event Integration", () => {
    it("should emit battle-specific events correctly", () => {
      const battleHandler = vi.fn();

      onBattleEvent("battleStateChange", battleHandler);
      emitBattleEvent("battleStateChange", {
        fromState: "roundStart",
        toState: "roundOver"
      });

      expect(battleHandler).toHaveBeenCalledTimes(1);
      expect(battleHandler.mock.calls[0][0].detail).toEqual({
        fromState: "roundStart",
        toState: "roundOver"
      });
    });

    it("should handle timer events", () => {
      const timerHandler = vi.fn();

      onBattleEvent("roundTimeout", timerHandler);
      emitBattleEvent("roundTimeout", {
        round: 1,
        timeRemaining: 0
      });

      expect(timerHandler).toHaveBeenCalledTimes(1);
      expect(timerHandler.mock.calls[0][0].detail.round).toBe(1);
    });

    it("should handle UI events", () => {
      const uiHandler = vi.fn();

      onBattleEvent("statButtons:enable", uiHandler);
      emitBattleEvent("statButtons:enable", {
        enabled: true,
        availableStats: ["strength", "speed"]
      });

      expect(uiHandler).toHaveBeenCalledTimes(1);
      expect(uiHandler.mock.calls[0][0].detail.enabled).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle emission errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // This should not throw
      emitBattleEvent("", { test: true });
      emitBattleEvent(null, { test: true });

      // Clean up
      consoleSpy.mockRestore();
    });

    it("should continue working after reset", () => {
      const handler = vi.fn();

      onBattleEvent("testEvent", handler);
      emitBattleEvent("testEvent", { before: "reset" });

      __resetBattleEventTarget();

      onBattleEvent("testEvent", handler);
      emitBattleEvent("testEvent", { after: "reset" });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[0][0].detail).toEqual({ before: "reset" });
      expect(handler.mock.calls[1][0].detail).toEqual({ after: "reset" });
    });
  });
});
