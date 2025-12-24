import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import {
  emitBattleEventWithAliases,
  onBattleEvent,
  __resetBattleEventTarget
} from "../../../src/helpers/classicBattle/battleEvents.js";
import { REVERSE_EVENT_ALIASES } from "../../../src/helpers/classicBattle/eventAliases.js";
import { withMutedConsole } from "../../utils/console.js";

describe("Battle Event Aliases", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Deprecated Event Name Mapping", () => {
    it("should emit both standardized and deprecated event names", async () => {
      const standardHandler = vi.fn();
      const deprecatedHandler = vi.fn();

      // "roundTimeout" is deprecated, maps to "timer.roundExpired"
      onBattleEvent("timer.roundExpired", standardHandler);
      onBattleEvent("roundTimeout", deprecatedHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("roundTimeout", { round: 1 });
      });

      expect(standardHandler).toHaveBeenCalledTimes(1);
      expect(deprecatedHandler).toHaveBeenCalledTimes(1);
      expect(standardHandler.mock.calls[0][0].detail).toEqual({ round: 1 });
    });

    it("should map deprecated names to standardized names via REVERSE_EVENT_ALIASES", () => {
      expect(REVERSE_EVENT_ALIASES["roundTimeout"]).toBe("timer.roundExpired");
      expect(REVERSE_EVENT_ALIASES["statButtons:enable"]).toBe("ui.statButtonsEnabled");
      expect(REVERSE_EVENT_ALIASES["matchOver"]).toBe("state.matchOver");
    });

    it("should emit using standardized name directly", async () => {
      const standardHandler = vi.fn();
      const deprecatedHandler = vi.fn();

      onBattleEvent("timer.roundExpired", standardHandler);
      onBattleEvent("roundTimeout", deprecatedHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("timer.roundExpired", { round: 2 });
      });

      expect(standardHandler).toHaveBeenCalledTimes(1);
      expect(deprecatedHandler).toHaveBeenCalledTimes(1);
      expect(standardHandler.mock.calls[0][0].detail).toEqual({ round: 2 });
    });

    it("should handle standard event with multiple aliases", async () => {
      const standardHandler = vi.fn();
      const deprecated1Handler = vi.fn();
      const deprecated2Handler = vi.fn();

      // "state.roundStarted" has two deprecated aliases:
      // "roundStarted" and "round.started"
      onBattleEvent("state.roundStarted", standardHandler);
      onBattleEvent("roundStarted", deprecated1Handler);
      onBattleEvent("round.started", deprecated2Handler);

      await withMutedConsole(async () => {
        // Emit using standard name - should emit standard + both aliases
        emitBattleEventWithAliases("state.roundStarted", { round: 1 });
      });

      // All should receive the event (standard + both aliases are emitted)
      expect(standardHandler).toHaveBeenCalledTimes(1);
      expect(deprecated1Handler).toHaveBeenCalledTimes(1);
      expect(deprecated2Handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("warnDeprecated Option", () => {
    it("should warn when using deprecated event name in test environment", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      emitBattleEventWithAliases("roundTimeout", { round: 1 }, { warnDeprecated: true });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Deprecated event name 'roundTimeout'")
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("timer.roundExpired"));

      consoleWarnSpy.mockRestore();
    });

    it("should suppress warnings when warnDeprecated is false", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("roundTimeout", { round: 1 }, { warnDeprecated: false });
      });

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should not warn when using standardized event name", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("timer.roundExpired", { round: 1 });
      });

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("skipAliases Option", () => {
    it("should skip emitting deprecated aliases when skipAliases is true", async () => {
      const standardHandler = vi.fn();
      const deprecatedHandler = vi.fn();

      onBattleEvent("timer.roundExpired", standardHandler);
      onBattleEvent("roundTimeout", deprecatedHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("timer.roundExpired", { round: 1 }, { skipAliases: true });
      });

      expect(standardHandler).toHaveBeenCalledTimes(1);
      expect(deprecatedHandler).not.toHaveBeenCalled();
    });

    it("should emit both when skipAliases is false or undefined", async () => {
      const standardHandler = vi.fn();
      const deprecatedHandler = vi.fn();

      onBattleEvent("state.matchOver", standardHandler);
      onBattleEvent("matchOver", deprecatedHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("state.matchOver", { winner: "player" });
      });

      expect(standardHandler).toHaveBeenCalledTimes(1);
      expect(deprecatedHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling and Fallback", () => {
    it("should handle errors gracefully and fall back to basic emit", async () => {
      const handler = vi.fn();

      onBattleEvent("testEvent", handler);

      // Emit with intentionally problematic payload (circular reference)
      const circularObj = { data: "test" };
      circularObj.circular = circularObj;

      await withMutedConsole(async () => {
        // Should not throw, should fall back to basic emit
        emitBattleEventWithAliases("testEvent", circularObj);
      });

      // Handler should still receive the event via fallback
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should emit event even if alias system fails", async () => {
      const handler = vi.fn();

      onBattleEvent("unknownEvent", handler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("unknownEvent", { data: "test" });
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ data: "test" });
    });
  });

  describe("Event Payload Preservation", () => {
    it("should preserve complex payloads through aliasing", async () => {
      const handler = vi.fn();
      const complexPayload = {
        nested: {
          data: "value",
          array: [1, 2, 3]
        },
        timestamp: Date.now(),
        flag: true
      };

      onBattleEvent("timer.roundExpired", handler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("roundTimeout", complexPayload);
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(complexPayload);
    });

    it("should handle null and undefined payloads", async () => {
      const nullHandler = vi.fn();
      const undefinedHandler = vi.fn();

      onBattleEvent("timer.roundExpired", nullHandler);
      onBattleEvent("state.matchOver", undefinedHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("roundTimeout", null);
        emitBattleEventWithAliases("matchOver", undefined);
      });

      expect(nullHandler).toHaveBeenCalledTimes(1);
      expect(undefinedHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integration with Standard Event System", () => {
    it("should work with standard onBattleEvent listeners", async () => {
      const handler = vi.fn();

      // Use standard subscription
      onBattleEvent("player.statSelected", handler);

      // Emit using alias system
      await withMutedConsole(async () => {
        emitBattleEventWithAliases("statSelected", { stat: "power" });
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual({ stat: "power" });
    });

    it("should maintain event isolation between tests", async () => {
      const handler1 = vi.fn();

      onBattleEvent("test.event", handler1);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("test.event", { test: 1 });
      });

      expect(handler1).toHaveBeenCalledTimes(1);

      // Reset and verify isolation
      __resetBattleEventTarget();
      const handler2 = vi.fn();
      onBattleEvent("test.event", handler2);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("test.event", { test: 2 });
      });

      expect(handler1).toHaveBeenCalledTimes(1); // Still 1 from before reset
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe("Real-World Battle Event Scenarios", () => {
    it("should handle timer events with aliases", async () => {
      const timerHandler = vi.fn();

      onBattleEvent("timer.roundExpired", timerHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("roundTimeout", {
          round: 3,
          timeRemaining: 0,
          playerStat: "speed",
          opponentStat: "power"
        });
      });

      expect(timerHandler).toHaveBeenCalledTimes(1);
      expect(timerHandler.mock.calls[0][0].detail.round).toBe(3);
    });

    it("should handle UI state transitions with aliases", async () => {
      const enableHandler = vi.fn();
      const disableHandler = vi.fn();

      onBattleEvent("ui.statButtonsEnabled", enableHandler);
      onBattleEvent("ui.statButtonsDisabled", disableHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("statButtons:enable", { stats: ["power", "speed"] });
        emitBattleEventWithAliases("statButtons:disable", { reason: "roundOver" });
      });

      expect(enableHandler).toHaveBeenCalledTimes(1);
      expect(disableHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle match state events with aliases", async () => {
      const matchOverHandler = vi.fn();

      onBattleEvent("state.matchOver", matchOverHandler);

      await withMutedConsole(async () => {
        emitBattleEventWithAliases("matchOver", {
          winner: "player",
          playerScore: 3,
          opponentScore: 1
        });
      });

      expect(matchOverHandler).toHaveBeenCalledTimes(1);
      expect(matchOverHandler.mock.calls[0][0].detail.winner).toBe("player");
    });
  });
});
