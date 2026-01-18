import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";

/**
 * Edge case tests for simulateOpponentStat and chooseOpponentStat functions.
 * Tests input validation, error handling, and boundary conditions.
 */
describe("simulateOpponentStat edge cases", () => {
  let simulateOpponentStat;
  let chooseOpponentStat;
  let STATS;
  let setTestMode;

  beforeEach(async () => {
    ({ simulateOpponentStat } = await import(
      "../../../src/helpers/classicBattle/selectionHandler.js"
    ));
    ({ chooseOpponentStat } = await import("../../../src/helpers/api/battleUI.js"));
    ({ STATS } = await import("../../../src/helpers/battleEngineFacade.js"));
    ({ setTestMode } = await import("../../../src/helpers/testModeUtils.js"));
    setTestMode(false);
  });

  afterEach(() => {
    if (setTestMode) {
      setTestMode(false);
    }
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Input Validation", () => {
    it("throws TypeError when stats is null", () => {
      expect(() => simulateOpponentStat(null, "easy")).toThrow(TypeError);
      expect(() => simulateOpponentStat(null, "easy")).toThrow(/stats must be a valid object/);
    });

    it("throws TypeError when stats is undefined", () => {
      expect(() => simulateOpponentStat(undefined, "easy")).toThrow(TypeError);
      expect(() => simulateOpponentStat(undefined, "easy")).toThrow(/stats must be a valid object/);
    });

    it("throws TypeError when stats is an array", () => {
      expect(() => simulateOpponentStat([1, 2, 3], "easy")).toThrow(TypeError);
      expect(() => simulateOpponentStat([1, 2, 3], "easy")).toThrow(/stats must be a valid object/);
    });

    it("throws TypeError when stats is a primitive", () => {
      expect(() => simulateOpponentStat("invalid", "easy")).toThrow(TypeError);
      expect(() => simulateOpponentStat(123, "easy")).toThrow(TypeError);
      expect(() => simulateOpponentStat(true, "easy")).toThrow(TypeError);
    });

    it("accepts empty stats object and returns a valid stat", () => {
      const result = simulateOpponentStat({}, "easy");
      expect(STATS).toContain(result);
    });

    it("handles stats with all zero values on hard difficulty", () => {
      const stats = { power: 0, speed: 0, technique: 0, kumikata: 0, newaza: 0 };
      const result = simulateOpponentStat(stats, "hard");
      expect(STATS).toContain(result);
    });

    it("handles stats with missing properties by treating them as 0", () => {
      const stats = { power: 5 }; // Other stats missing
      const result = simulateOpponentStat(stats, "medium");
      expect(STATS).toContain(result);
    });

    it("handles stats with NaN values by treating them as 0", () => {
      const stats = { power: NaN, speed: 5, technique: NaN, kumikata: 3, newaza: NaN };
      const result = simulateOpponentStat(stats, "medium");
      expect(STATS).toContain(result);
    });

    it("handles stats with negative values correctly", () => {
      const stats = { power: -5, speed: 10, technique: -3, kumikata: 8, newaza: -1 };
      setTestMode({ enabled: true, seed: 42 });
      const result = simulateOpponentStat(stats, "hard");
      // Should pick speed (10) as it's the highest
      expect(result).toBe("speed");
      setTestMode(false);
    });

    it("handles stats with extremely large values", () => {
      const stats = {
        power: Number.MAX_SAFE_INTEGER,
        speed: 5,
        technique: 3,
        kumikata: 2,
        newaza: 1
      };
      setTestMode({ enabled: true, seed: 42 });
      const result = simulateOpponentStat(stats, "hard");
      expect(result).toBe("power");
      setTestMode(false);
    });

    it("handles stats with floating point values", () => {
      const stats = { power: 5.7, speed: 5.3, technique: 5.5, kumikata: 5.1, newaza: 5.9 };
      setTestMode({ enabled: true, seed: 42 });
      const result = simulateOpponentStat(stats, "hard");
      // Should pick newaza (5.9) as it's the highest
      expect(result).toBe("newaza");
      setTestMode(false);
    });
  });

  describe("chooseOpponentStat edge cases", () => {
    it("handles empty values array gracefully", () => {
      const result = chooseOpponentStat([], "easy");
      expect(STATS).toContain(result);
    });

    it("handles null values array gracefully", () => {
      const result = chooseOpponentStat(null, "easy");
      expect(STATS).toContain(result);
    });

    it("handles undefined values array gracefully", () => {
      const result = chooseOpponentStat(undefined, "easy");
      expect(STATS).toContain(result);
    });

    it("handles single stat value on hard difficulty", () => {
      const values = [{ stat: "power", value: 5 }];
      const result = chooseOpponentStat(values, "hard");
      expect(result).toBe("power");
    });

    it("handles all stats with equal values on hard difficulty", () => {
      const values = STATS.map((stat) => ({ stat, value: 5 }));
      const result = chooseOpponentStat(values, "hard");
      // Should return one of the stats (all are tied for max)
      expect(STATS).toContain(result);
    });

    it("handles all stats with equal values on medium difficulty", () => {
      const values = STATS.map((stat) => ({ stat, value: 5 }));
      const result = chooseOpponentStat(values, "medium");
      // All stats are at average (5), so all should be eligible
      expect(STATS).toContain(result);
    });

    it("handles medium difficulty when all stats below average", () => {
      // This shouldn't happen in practice, but test the fallback
      const values = [
        { stat: "power", value: 5 },
        { stat: "speed", value: 5.1 }
      ];
      // Average = 5.05, so technically power < avg
      const result = chooseOpponentStat(values, "medium");
      expect(["power", "speed"]).toContain(result);
    });

    it("handles invalid difficulty value by treating as easy", () => {
      const values = STATS.map((stat, idx) => ({ stat, value: idx + 1 }));
      const result = chooseOpponentStat(values, "invalid");
      expect(STATS).toContain(result);
    });

    it("returns consistent result with same seed on hard difficulty", () => {
      const values = [
        { stat: "power", value: 8 },
        { stat: "speed", value: 8 }
      ];

      setTestMode({ enabled: true, seed: 123 });
      const result1 = chooseOpponentStat(values, "hard");

      setTestMode({ enabled: true, seed: 123 });
      const result2 = chooseOpponentStat(values, "hard");

      expect(result1).toBe(result2);
      setTestMode(false);
    });

    it("handles values with non-numeric value property", () => {
      const values = [
        { stat: "power", value: "not a number" },
        { stat: "speed", value: 5 }
      ];
      // The filtering logic removes non-numeric values before processing
      const result = chooseOpponentStat(values, "hard");
      expect(result).toBe("speed"); // Should pick the valid number
    });
  });

  describe("Boundary Conditions", () => {
    it("handles very close floating point values on hard difficulty", () => {
      const values = [
        { stat: "power", value: 5.9999999999 },
        { stat: "speed", value: 6.0000000001 }
      ];
      setTestMode({ enabled: true, seed: 42 });
      const result = chooseOpponentStat(values, "hard");
      // Should pick speed as it's marginally higher
      expect(result).toBe("speed");
      setTestMode(false);
    });

    it("handles stats at exact average boundary on medium difficulty", () => {
      const values = [
        { stat: "power", value: 4 },
        { stat: "speed", value: 6 }
      ];
      // Average = 5, so only speed >= avg
      setTestMode({ enabled: true, seed: 42 });
      const result = chooseOpponentStat(values, "medium");
      expect(result).toBe("speed");
      setTestMode(false);
    });
  });

  describe("Stress Tests", () => {
    it("handles many repeated calls without memory leaks", () => {
      const stats = { power: 5, speed: 7, technique: 3, kumikata: 6, newaza: 8 };
      for (let i = 0; i < 1000; i++) {
        const result = simulateOpponentStat(stats, "easy");
        expect(STATS).toContain(result);
      }
    });

    it("handles rapid difficulty changes", () => {
      const stats = { power: 5, speed: 7, technique: 3, kumikata: 6, newaza: 8 };
      const difficulties = ["easy", "medium", "hard"];

      for (let i = 0; i < 100; i++) {
        const difficulty = difficulties[i % 3];
        const result = simulateOpponentStat(stats, difficulty);
        expect(STATS).toContain(result);
      }
    });
  });
});
