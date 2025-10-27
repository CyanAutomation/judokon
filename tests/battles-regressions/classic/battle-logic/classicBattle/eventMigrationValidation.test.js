import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  onBattleEvent,
  __resetBattleEventTarget
} from "../../../src/helpers/classicBattle/battleEvents.js";
import {
  emitBattleEventWithAliases,
  getMigrationInfo,
  isDeprecatedEventName
} from "../../../src/helpers/classicBattle/eventAliases.js";

describe("Event Migration Validation", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
    // Reset console warnings
    vi.clearAllMocks();
  });

  describe("Backward Compatibility Validation", () => {
    it("should emit both new and old events when using new event name", async () => {
      const newEventHandler = vi.fn();
      const oldEventHandler = vi.fn();

      // Listen for both new standardized and old deprecated names
      onBattleEvent("timer.roundExpired", newEventHandler);
      onBattleEvent("roundTimeout", oldEventHandler);

      // Emit using new standardized name
      emitBattleEventWithAliases("timer.roundExpired", { round: 1 });

      // Both handlers should receive the event
      expect(newEventHandler).toHaveBeenCalledTimes(1);
      expect(oldEventHandler).toHaveBeenCalledTimes(1);

      expect(newEventHandler.mock.calls[0][0].detail).toEqual({ round: 1 });
      expect(oldEventHandler.mock.calls[0][0].detail).toEqual({ round: 1 });
    });

    it("should convert old event names to new names with deprecation warning", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const newEventHandler = vi.fn();
      const oldEventHandler = vi.fn();

      onBattleEvent("timer.roundExpired", newEventHandler);
      onBattleEvent("roundTimeout", oldEventHandler);

      // Emit using OLD deprecated name
      emitBattleEventWithAliases("roundTimeout", { round: 2 });

      // Should show deprecation warning
      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ Deprecated event name 'roundTimeout' used. Update to 'timer.roundExpired'"
      );

      // Both handlers should still receive the event
      expect(newEventHandler).toHaveBeenCalledTimes(1);
      expect(oldEventHandler).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should handle multiple old names mapping to same new name", async () => {
      const handler = vi.fn();

      onBattleEvent("state.roundStarted", handler);

      // Both old names should map to the same new name
      emitBattleEventWithAliases("roundStarted", { test: 1 });
      emitBattleEventWithAliases("round.started", { test: 2 });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[0][0].detail).toEqual({ test: 1 });
      expect(handler.mock.calls[1][0].detail).toEqual({ test: 2 });
    });
  });

  describe("Migration Helper Validation", () => {
    it("should correctly identify deprecated event names", () => {
      const deprecatedEvents = [
        "roundTimeout",
        "statButtons:enable",
        "matchOver",
        "scoreboardShowMessage",
        "nextRoundCountdownStarted"
      ];

      deprecatedEvents.forEach((eventName) => {
        expect(isDeprecatedEventName(eventName)).toBe(true);

        const migrationInfo = getMigrationInfo(eventName);
        expect(migrationInfo.isDeprecated).toBe(true);
        expect(migrationInfo.migrationNeeded).toBe(true);
        expect(migrationInfo.recommendedName).toBeDefined();
        expect(migrationInfo.migrationMessage).toContain("Update");
      });
    });

    it("should correctly identify non-deprecated event names", () => {
      const standardizedEvents = [
        "timer.roundExpired",
        "ui.statButtonsEnabled",
        "state.matchOver",
        "scoreboard.messageShown",
        "timer.countdownStarted"
      ];

      standardizedEvents.forEach((eventName) => {
        expect(isDeprecatedEventName(eventName)).toBe(false);

        const migrationInfo = getMigrationInfo(eventName);
        expect(migrationInfo.isDeprecated).toBe(false);
        expect(migrationInfo.migrationNeeded).toBe(false);
        expect(migrationInfo.recommendedName).toBe(eventName);
      });
    });
  });

  describe("Test Helper Migration Validation", () => {
    it("should support both old and new event names in test promises", async () => {
      let resolveCount = 0;

      // Test helper using new name
      const newNamePromise = new Promise((resolve) => {
        onBattleEvent("timer.roundExpired", () => {
          resolveCount++;
          resolve("new");
        });
      });

      // Test helper using old name
      const oldNamePromise = new Promise((resolve) => {
        onBattleEvent("roundTimeout", () => {
          resolveCount++;
          resolve("old");
        });
      });

      // Emit using new standardized name
      emitBattleEventWithAliases("timer.roundExpired", { test: true });

      // Both promises should resolve due to alias system
      const [newResult, oldResult] = await Promise.all([newNamePromise, oldNamePromise]);

      expect(newResult).toBe("new");
      expect(oldResult).toBe("old");
      expect(resolveCount).toBe(2);
    });
  });

  describe("Performance and Reliability", () => {
    it("should handle high-frequency events without issues", () => {
      const handler = vi.fn();
      onBattleEvent("timer.roundExpired", handler);

      // Emit many events rapidly
      for (let i = 0; i < 100; i++) {
        emitBattleEventWithAliases("timer.roundExpired", { iteration: i });
      }

      expect(handler).toHaveBeenCalledTimes(100);
      expect(handler.mock.calls[99][0].detail.iteration).toBe(99);
    });

    it("should handle events with complex payloads", () => {
      const handler = vi.fn();
      onBattleEvent("state.transitioned", handler);

      const complexPayload = {
        from: "roundStart",
        to: "roundOver",
        metadata: {
          round: 1,
          stats: { strength: 75, speed: 60 },
          timestamp: Date.now(),
          nested: { deep: { value: "test" } }
        }
      };

      emitBattleEventWithAliases("state.transitioned", complexPayload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(complexPayload);
    });
  });
});
