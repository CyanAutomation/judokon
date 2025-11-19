import { describe, it, expect } from "vitest";
import {
  applyAdvancedFilters,
  validateAdvancedFilters,
  getFilterDocumentation,
  parseStatFilter,
  parseWeightClass
} from "../src/helpers/advancedFilters.js";

describe("Advanced Filters", () => {
  // Sample judoka for testing
  const judokaHigh = {
    id: 1,
    name: "Strong Fighter",
    weightClass: "+100",
    stats: {
      power: 9,
      speed: 8,
      technique: 9,
      kumikata: 9,
      newaza: 8
    }
  };

  const judokaLow = {
    id: 2,
    name: "Weak Fighter",
    weightClass: "-60",
    stats: {
      power: 2,
      speed: 2,
      technique: 2,
      kumikata: 2,
      newaza: 2
    }
  };

  const judokaMid = {
    id: 3,
    name: "Average Fighter",
    weightClass: "-70",
    stats: {
      power: 5,
      speed: 5,
      technique: 5,
      kumikata: 5,
      newaza: 5
    }
  };

  describe("Stat Threshold Parsing", () => {
    it("should parse stat filter with >= operator", () => {
      const result = parseStatFilter("power>=8");
      expect(result).toEqual({
        stat: "power",
        operator: ">=",
        value: 8,
        description: "power >= 8"
      });
    });

    it("should parse stat filter with spaces", () => {
      const result = parseStatFilter("technique < 5");
      expect(result).toEqual({
        stat: "technique",
        operator: "<",
        value: 5,
        description: "technique < 5"
      });
    });

    it("should handle case-insensitive stat names", () => {
      const result = parseStatFilter("POWER>=7");
      expect(result.stat).toBe("power");
    });

    it("should return null for invalid filter", () => {
      expect(parseStatFilter("invalid")).toBeNull();
      expect(parseStatFilter("power")).toBeNull();
      expect(parseStatFilter("xyz>=5")).toBeNull();
    });

    it("should support all comparison operators with parsed structure and application", () => {
      const judokaHighPower = { ...judokaHigh, stats: { ...judokaHigh.stats, power: 9 } };
      const judokaLowPower = { ...judokaLow, stats: { ...judokaLow.stats, power: 2 } };

      const cases = [
        {
          filter: "power>=8",
          expected: { stat: "power", operator: ">=", value: 8 },
          passes: judokaHighPower,
          fails: judokaLowPower
        },
        {
          filter: "power<=3",
          expected: { stat: "power", operator: "<=", value: 3 },
          passes: judokaLowPower,
          fails: judokaHighPower
        },
        {
          filter: "power>2",
          expected: { stat: "power", operator: ">", value: 2 },
          passes: judokaHighPower,
          fails: judokaLowPower
        },
        {
          filter: "power<3",
          expected: { stat: "power", operator: "<", value: 3 },
          passes: judokaLowPower,
          fails: judokaHighPower
        },
        {
          filter: "power==9",
          expected: { stat: "power", operator: "==", value: 9 },
          passes: judokaHighPower,
          fails: judokaLowPower
        },
        {
          filter: "power!=2",
          expected: { stat: "power", operator: "!=", value: 2 },
          passes: judokaHighPower,
          fails: judokaLowPower
        }
      ];

      cases.forEach(({ filter, expected, passes, fails }) => {
        const parsed = parseStatFilter(filter);
        expect(parsed).toMatchObject(expected);

        const filters = { statThresholds: [filter] };
        expect(applyAdvancedFilters(passes, filters)).toBe(true);
        expect(applyAdvancedFilters(fails, filters)).toBe(false);
      });
    });
  });

  describe("Weight Class Parsing", () => {
    it("should parse + weight class (heavy)", () => {
      const result = parseWeightClass("+100");
      expect(result).toEqual({
        operator: "gte",
        value: 100,
        description: ">= 100kg"
      });
    });

    it("should parse - weight class (light)", () => {
      const result = parseWeightClass("-60");
      expect(result).toEqual({
        operator: "lte",
        value: 60,
        description: "<= 60kg"
      });
    });

    it("should parse exact weight (no prefix)", () => {
      const result = parseWeightClass("70");
      expect(result).toEqual({
        operator: "eq",
        value: 70,
        description: "exactly 70kg"
      });
    });

    it("should return null for invalid weight class", () => {
      expect(parseWeightClass("abc")).toBeNull();
      expect(parseWeightClass("++100")).toBeNull();
      expect(parseWeightClass("")).toBeNull();
      expect(parseWeightClass(null)).toBeNull();
    });
  });

  describe("Stat Threshold Application", () => {
    it("should filter by power >= threshold", () => {
      const filters = { statThresholds: ["power>=9"] };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(false);
    });

    it("should filter by speed < threshold", () => {
      const filters = { statThresholds: ["speed<9"] };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(true);
    });

    it("should handle multiple stat thresholds (AND logic)", () => {
      const filters = {
        statThresholds: ["power>=9", "technique>=9", "speed>=8"]
      };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaMid, filters)).toBe(false);
    });

    it("should support != operator for stat inequality", () => {
      const filters = { statThresholds: ["power!=0"] };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(true);
    });

    it("should support == operator for exact stat match", () => {
      const filters = { statThresholds: ["power==9"] };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaMid, filters)).toBe(false);
    });
  });

  describe("Weight Range Application", () => {
    it("should filter by + weight class (heavy)", () => {
      const filters = { weightRange: "+100" };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(false);
    });

    it("should filter by - weight class (light)", () => {
      const filters = { weightRange: "-60" };
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(false);
    });

    it("should filter by exact weight class", () => {
      const filters = { weightRange: "-70" };
      expect(applyAdvancedFilters(judokaMid, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(false);
    });
  });

  describe("Average Stats Filters", () => {
    it("should filter by minimum average stats", () => {
      const filters = { minAverageStats: 8 };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaMid, filters)).toBe(false);
    });

    it("should filter by maximum average stats", () => {
      const filters = { maxAverageStats: 3 };
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(false);
    });

    it("should support both min and max average stats", () => {
      const filters = { minAverageStats: 4, maxAverageStats: 6 };
      expect(applyAdvancedFilters(judokaMid, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(false);
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(false);
    });
  });

  describe("Skill Floor Filter", () => {
    it("should filter by minimum all stats (skill floor)", () => {
      const filters = { minAllStats: 8 };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaMid, filters)).toBe(false);
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(false);
    });

    it("should require ALL stats to meet minimum", () => {
      const judokaUneven = {
        id: 4,
        name: "Uneven Fighter",
        weightClass: "+100",
        stats: {
          power: 9,
          speed: 9,
          technique: 9,
          kumikata: 9,
          newaza: 3 // One weak stat
        }
      };

      const filters = { minAllStats: 5 };
      expect(applyAdvancedFilters(judokaUneven, filters)).toBe(false);
    });
  });

  describe("Composite Filters", () => {
    it("should apply stat thresholds AND weight range", () => {
      const filters = {
        statThresholds: ["power>=9"],
        weightRange: "+100"
      };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaLow, filters)).toBe(false);
    });

    it("should apply all filter types together", () => {
      const filters = {
        statThresholds: ["power>=8"],
        weightRange: "+100",
        minAverageStats: 8
      };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(true);
      expect(applyAdvancedFilters(judokaMid, filters)).toBe(false);
    });

    it("should fail if any filter condition is not met", () => {
      const filters = {
        statThresholds: ["power>=9"],
        weightRange: "-60" // Wrong weight class
      };
      expect(applyAdvancedFilters(judokaHigh, filters)).toBe(false);
    });
  });

  describe("Filter Validation", () => {
    it("should validate and filter out invalid stat thresholds", () => {
      const filters = {
        statThresholds: ["power>=8", "invalid_filter", "speed<5"]
      };
      const validated = validateAdvancedFilters(filters);
      expect(validated.statThresholds).toContain("power>=8");
      expect(validated.statThresholds).toContain("speed<5");
      expect(validated.statThresholds).not.toContain("invalid_filter");
    });

    it("should validate weight range", () => {
      const filters = { weightRange: "+100" };
      const validated = validateAdvancedFilters(filters);
      expect(validated.weightRange).toBe("+100");
    });

    it("should reject invalid weight range", () => {
      const filters = { weightRange: "invalid" };
      const validated = validateAdvancedFilters(filters);
      expect(validated.weightRange).toBeUndefined();
    });

    it("should validate numeric ranges (0-10)", () => {
      const filters = {
        minAverageStats: 8,
        maxAverageStats: 12 // Out of range
      };
      const validated = validateAdvancedFilters(filters);
      expect(validated.minAverageStats).toBe(8);
      expect(validated.maxAverageStats).toBeUndefined();
    });

    it("should handle null/undefined filters", () => {
      expect(validateAdvancedFilters(null)).toEqual({});
      expect(validateAdvancedFilters(undefined)).toEqual({});
      expect(validateAdvancedFilters({})).toEqual({});
    });
  });

  describe("Empty/No Filters", () => {
    it("should pass judoka with no filters", () => {
      expect(applyAdvancedFilters(judokaHigh, {})).toBe(true);
      expect(applyAdvancedFilters(judokaLow, null)).toBe(true);
      expect(applyAdvancedFilters(judokaMid, undefined)).toBe(true);
    });
  });

  describe("Filter Documentation", () => {
    it("should provide filter documentation", () => {
      const docs = getFilterDocumentation();
      expect(docs).toHaveProperty("statThresholds");
      expect(docs).toHaveProperty("weightRange");
      expect(docs).toHaveProperty("minAverageStats");
      expect(docs).toHaveProperty("maxAverageStats");
      expect(docs).toHaveProperty("minAllStats");
    });

    it("should include examples in documentation", () => {
      const docs = getFilterDocumentation();
      expect(docs.statThresholds.examples).toContain("power>=8");
      expect(docs.weightRange.examples).toContain("+100 (heavy class)");
    });
  });

  describe("Edge Cases", () => {
    it("should handle judoka with missing stats", () => {
      const brokenJudoka = {
        id: 5,
        name: "Broken Fighter",
        weightClass: "+100",
        stats: {
          power: 9
          // Missing other stats
        }
      };

      const filters = { statThresholds: ["speed>=5"] };
      expect(applyAdvancedFilters(brokenJudoka, filters)).toBe(false);
    });

    it("should handle zero values in stats", () => {
      const zeroJudoka = {
        id: 6,
        name: "Zero Fighter",
        weightClass: "+100",
        stats: {
          power: 0,
          speed: 0,
          technique: 0,
          kumikata: 0,
          newaza: 0
        }
      };

      const filters = { statThresholds: ["power==0"] };
      expect(applyAdvancedFilters(zeroJudoka, filters)).toBe(true);
    });

    it("should handle boundary values", () => {
      const boundaryJudoka = {
        id: 7,
        name: "Boundary Fighter",
        weightClass: "+100",
        stats: {
          power: 10,
          speed: 10,
          technique: 10,
          kumikata: 10,
          newaza: 10
        }
      };

      expect(applyAdvancedFilters(boundaryJudoka, { statThresholds: ["power<=10"] })).toBe(true);
      expect(applyAdvancedFilters(boundaryJudoka, { statThresholds: ["power>=10"] })).toBe(true);
      expect(applyAdvancedFilters(boundaryJudoka, { minAverageStats: 10 })).toBe(true);
    });
  });
});
