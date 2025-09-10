import { describe, expect, it, vi } from "vitest";
import {
  EVENT_ALIASES,
  REVERSE_EVENT_ALIASES,
  emitEventWithAliases,
  emitBattleEventWithAliases,
  getMigrationInfo,
  disableAliases,
  isDeprecatedEventName
} from "../../../src/helpers/classicBattle/eventAliases.js";

describe("Event Alias System", () => {
  describe("EVENT_ALIASES mapping", () => {
    it("should have correct timer event aliases", () => {
      expect(EVENT_ALIASES["timer.roundExpired"]).toContain("roundTimeout");
      expect(EVENT_ALIASES["timer.countdownStarted"]).toContain("control.countdown.started");
      expect(EVENT_ALIASES["timer.countdownStarted"]).toContain("nextRoundCountdownStarted");
    });

    it("should have correct UI event aliases", () => {
      expect(EVENT_ALIASES["ui.statButtonsEnabled"]).toContain("statButtons:enable");
      expect(EVENT_ALIASES["ui.statButtonsDisabled"]).toContain("statButtons:disable");
    });

    it("should have correct state event aliases", () => {
      expect(EVENT_ALIASES["state.matchOver"]).toContain("matchOver");
      expect(EVENT_ALIASES["state.roundStarted"]).toContain("roundStarted");
      expect(EVENT_ALIASES["state.roundStarted"]).toContain("round.started");
    });
  });

  describe("REVERSE_EVENT_ALIASES mapping", () => {
    it("should correctly reverse-map old names to new names", () => {
      expect(REVERSE_EVENT_ALIASES["roundTimeout"]).toBe("timer.roundExpired");
      expect(REVERSE_EVENT_ALIASES["statButtons:enable"]).toBe("ui.statButtonsEnabled");
      expect(REVERSE_EVENT_ALIASES["matchOver"]).toBe("state.matchOver");
    });

    it("should handle multiple old names mapping to same new name", () => {
      expect(REVERSE_EVENT_ALIASES["roundStarted"]).toBe("state.roundStarted");
      expect(REVERSE_EVENT_ALIASES["round.started"]).toBe("state.roundStarted");
    });
  });

  describe("emitEventWithAliases", () => {
    it("should emit both new event name and aliases", () => {
      const mockEventTarget = {
        dispatchEvent: vi.fn()
      };

      emitEventWithAliases(
        mockEventTarget,
        "timer.roundExpired",
        { test: true },
        {
          warnDeprecated: false
        }
      );

      expect(mockEventTarget.dispatchEvent).toHaveBeenCalledTimes(2);

      // Check new event
      const newEventCall = mockEventTarget.dispatchEvent.mock.calls[0][0];
      expect(newEventCall.type).toBe("timer.roundExpired");
      expect(newEventCall.detail).toEqual({ test: true });

      // Check alias event
      const aliasEventCall = mockEventTarget.dispatchEvent.mock.calls[1][0];
      expect(aliasEventCall.type).toBe("roundTimeout");
      expect(aliasEventCall.detail).toEqual({ test: true });
    });

    it("should skip aliases when skipAliases is true", () => {
      const mockEventTarget = {
        dispatchEvent: vi.fn()
      };

      emitEventWithAliases(
        mockEventTarget,
        "timer.roundExpired",
        { test: true },
        {
          skipAliases: true
        }
      );

      expect(mockEventTarget.dispatchEvent).toHaveBeenCalledTimes(1);

      const eventCall = mockEventTarget.dispatchEvent.mock.calls[0][0];
      expect(eventCall.type).toBe("timer.roundExpired");
    });

    it("should warn about deprecated aliases in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const mockEventTarget = {
        dispatchEvent: vi.fn()
      };

      emitEventWithAliases(mockEventTarget, "timer.roundExpired", { test: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ Deprecated event alias 'roundTimeout' used. Update to 'timer.roundExpired'"
      );

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("getMigrationInfo", () => {
    it("should identify deprecated event names", () => {
      const info = getMigrationInfo("roundTimeout");

      expect(info.isDeprecated).toBe(true);
      expect(info.recommendedName).toBe("timer.roundExpired");
      expect(info.migrationNeeded).toBe(true);
      expect(info.migrationMessage).toBe("Update 'roundTimeout' to 'timer.roundExpired'");
    });

    it("should handle non-deprecated event names", () => {
      const info = getMigrationInfo("timer.roundExpired");

      expect(info.isDeprecated).toBe(false);
      expect(info.recommendedName).toBe("timer.roundExpired");
      expect(info.migrationNeeded).toBe(false);
    });
  });

  describe("disableAliases", () => {
    it("should remove specified aliases", () => {
      // Store original state
      const originalAliases = [...EVENT_ALIASES["timer.roundExpired"]];

      disableAliases(["roundTimeout"]);

      expect(EVENT_ALIASES["timer.roundExpired"]).not.toContain("roundTimeout");

      // Restore original state
      EVENT_ALIASES["timer.roundExpired"] = originalAliases;
    });
  });

  describe("isDeprecatedEventName", () => {
    it("should correctly identify deprecated names", () => {
      expect(isDeprecatedEventName("roundTimeout")).toBe(true);
      expect(isDeprecatedEventName("timer.roundExpired")).toBe(false);
    });
  });

  describe("emitBattleEventWithAliases integration", () => {
    it("should handle old event names by converting to new names", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Mock the battleEvents module
      vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
        getBattleEventTarget: () => ({
          dispatchEvent: vi.fn()
        })
      }));

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // This should warn and emit the standardized event name
      emitBattleEventWithAliases("roundTimeout", { test: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ Deprecated event name 'roundTimeout' used. Update to 'timer.roundExpired'"
      );

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
