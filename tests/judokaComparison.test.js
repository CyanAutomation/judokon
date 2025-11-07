/**
 * @fileoverview Comprehensive tests for judokaComparison utility
 * Tests cover validation, stat calculation, formatting, edge cases
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validateComparisonIds,
  validateJudokaForComparison,
  calculateStatDifferences,
  rankStatDifferences,
  generateComparisonSummary,
  formatComparisonReport,
  getComparisonDocumentation
} from "../src/helpers/judokaComparison.js";

describe("judokaComparison - Validation", () => {
  describe("validateComparisonIds", () => {
    it("should accept two different numeric IDs", () => {
      const result = validateComparisonIds(0, 1);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept string IDs that can convert to numbers", () => {
      const result = validateComparisonIds("42", "18");
      expect(result.valid).toBe(true);
    });

    it("should accept mixed string and numeric IDs", () => {
      const result = validateComparisonIds(0, "10");
      expect(result.valid).toBe(true);
    });

    it("should reject null id1", () => {
      const result = validateComparisonIds(null, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("id1");
    });

    it("should reject undefined id1", () => {
      const result = validateComparisonIds(undefined, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("id1");
    });

    it("should reject null id2", () => {
      const result = validateComparisonIds(0, null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("id2");
    });

    it("should reject undefined id2", () => {
      const result = validateComparisonIds(0, undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("id2");
    });

    it("should reject same ID", () => {
      const result = validateComparisonIds(5, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Cannot compare a judoka with themselves");
    });

    it("should reject non-numeric string IDs", () => {
      const result = validateComparisonIds("abc", "def");
      expect(result.valid).toBe(false);
    });

    it("should handle floating point IDs", () => {
      const result = validateComparisonIds(1.5, 2.5);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateJudokaForComparison", () => {
    let validJudoka1;
    let validJudoka2;

    beforeEach(() => {
      validJudoka1 = {
        id: 0,
        firstname: "John",
        surname: "Doe",
        stats: { power: 8, speed: 7, technique: 9 }
      };

      validJudoka2 = {
        id: 1,
        firstname: "Jane",
        surname: "Smith",
        stats: { power: 6, speed: 8, technique: 8 }
      };
    });

    it("should accept valid judoka records", () => {
      const result = validateJudokaForComparison(validJudoka1, validJudoka2);
      expect(result.valid).toBe(true);
    });

    it("should reject null judoka1", () => {
      const result = validateJudokaForComparison(null, validJudoka2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("First judoka");
    });

    it("should reject undefined judoka1", () => {
      const result = validateJudokaForComparison(undefined, validJudoka2);
      expect(result.valid).toBe(false);
    });

    it("should reject null judoka2", () => {
      const result = validateJudokaForComparison(validJudoka1, null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Second judoka");
    });

    it("should reject judoka with missing stats", () => {
      const judokaNoStats = { id: 0, firstname: "John", surname: "Doe" };
      const result = validateJudokaForComparison(judokaNoStats, validJudoka2);
      expect(result.valid).toBe(false);
    });

    it("should reject judoka with null stats", () => {
      const judokaNullStats = { id: 0, firstname: "John", surname: "Doe", stats: null };
      const result = validateJudokaForComparison(judokaNullStats, validJudoka2);
      expect(result.valid).toBe(false);
    });

    it("should reject judoka with stats that is not an object", () => {
      const judokaInvalidStats = { id: 0, firstname: "John", surname: "Doe", stats: "invalid" };
      const result = validateJudokaForComparison(judokaInvalidStats, validJudoka2);
      expect(result.valid).toBe(false);
    });
  });
});

describe("judokaComparison - Stat Calculations", () => {
  let judoka1;
  let judoka2;

  beforeEach(() => {
    judoka1 = {
      id: 0,
      firstname: "Strong",
      surname: "Fighter",
      stats: { power: 9, speed: 7, technique: 8, kumikata: 6, newaza: 7 }
    };

    judoka2 = {
      id: 1,
      firstname: "Fast",
      surname: "Fighter",
      stats: { power: 6, speed: 9, technique: 7, kumikata: 8, newaza: 6 }
    };
  });

  describe("calculateStatDifferences", () => {
    it("should calculate correct differences for all stats", () => {
      const diffs = calculateStatDifferences(judoka1, judoka2);
      expect(diffs.statDifferences.power).toBe(3);
      expect(diffs.statDifferences.speed).toBe(-2);
      expect(diffs.statDifferences.technique).toBe(1);
      expect(diffs.statDifferences.kumikata).toBe(-2);
      expect(diffs.statDifferences.newaza).toBe(1);
    });

    it("should calculate correct total absolute difference", () => {
      const diffs = calculateStatDifferences(judoka1, judoka2);
      // |3| + |-2| + |1| + |-2| + |1| = 9
      expect(diffs.totalAbsoluteDiff).toBe(9);
    });

    it("should calculate correct average difference", () => {
      const diffs = calculateStatDifferences(judoka1, judoka2);
      // 9 / 5 = 1.8
      expect(diffs.avgAbsoluteDiff).toBe(1.8);
    });

    it("should count stats correctly", () => {
      const diffs = calculateStatDifferences(judoka1, judoka2);
      expect(diffs.statCount).toBe(5);
    });

    it("should handle missing stats in judoka1", () => {
      const judokaPartial = { stats: { power: 5 } };
      const diffs = calculateStatDifferences(judokaPartial, judoka2);
      expect(diffs.statDifferences.power).toBe(-1);
      expect(diffs.statDifferences.speed).toBe(-9);
    });

    it("should handle missing stats in judoka2", () => {
      const judokaPartial = { stats: { power: 5 } };
      const diffs = calculateStatDifferences(judoka1, judokaPartial);
      expect(diffs.statDifferences.power).toBe(4);
      expect(diffs.statDifferences.speed).toBe(7);
    });

    it("should handle empty stats objects", () => {
      const judokaEmpty1 = { stats: {} };
      const judokaEmpty2 = { stats: {} };
      const diffs = calculateStatDifferences(judokaEmpty1, judokaEmpty2);
      expect(diffs.totalAbsoluteDiff).toBe(0);
      expect(diffs.avgAbsoluteDiff).toBe(0);
    });

    it("should handle perfectly matched judoka", () => {
      const matched1 = { stats: { power: 7, speed: 7, technique: 7 } };
      const matched2 = { stats: { power: 7, speed: 7, technique: 7 } };
      const diffs = calculateStatDifferences(matched1, matched2);
      expect(diffs.totalAbsoluteDiff).toBe(0);
      expect(diffs.avgAbsoluteDiff).toBe(0);
    });
  });

  describe("rankStatDifferences", () => {
    it("should rank stats by absolute difference descending", () => {
      const diffs = {
        power: 3,
        speed: -2,
        technique: 1,
        kumikata: -2,
        newaza: 1
      };
      const ranked = rankStatDifferences(diffs);
      expect(ranked[0].stat).toBe("power");
      expect(ranked[0].difference).toBe(3);
      // Stats with diff of 1 should be at the end (technique and newaza)
      const lastTwo = [ranked[ranked.length - 1].stat, ranked[ranked.length - 2].stat];
      expect(lastTwo).toContain("technique");
      expect(lastTwo).toContain("newaza");
    });

    it("should handle ties in ranking", () => {
      const diffs = { power: 2, speed: -2, technique: 1 };
      const ranked = rankStatDifferences(diffs);
      expect(ranked.length).toBe(3);
      // Both power and speed should be first (tied at 2)
      expect([ranked[0].stat, ranked[1].stat]).toContain("power");
      expect([ranked[0].stat, ranked[1].stat]).toContain("speed");
    });

    it("should handle empty object", () => {
      const ranked = rankStatDifferences({});
      expect(ranked).toEqual([]);
    });

    it("should handle null input", () => {
      const ranked = rankStatDifferences(null);
      expect(ranked).toEqual([]);
    });

    it("should handle undefined input", () => {
      const ranked = rankStatDifferences(undefined);
      expect(ranked).toEqual([]);
    });
  });
});

describe("judokaComparison - Summary Generation", () => {
  let judoka1;
  let judoka2;
  let differences;

  beforeEach(() => {
    judoka1 = {
      id: 0,
      firstname: "Strong",
      surname: "Fighter",
      stats: { power: 9, speed: 7, technique: 8 }
    };

    judoka2 = {
      id: 1,
      firstname: "Balanced",
      surname: "Fighter",
      stats: { power: 6, speed: 8, technique: 7 }
    };

    differences = calculateStatDifferences(judoka1, judoka2);
  });

  describe("generateComparisonSummary", () => {
    it("should identify judoka1 as winner when total stats are higher", () => {
      const summary = generateComparisonSummary(judoka1, judoka2, differences);
      expect(summary.winner).toContain("Strong Fighter");
      expect(summary.margin).toBeGreaterThan(0);
    });

    it("should identify judoka2 as winner when total stats are higher", () => {
      // Create judoka where second one is stronger
      const stronger1 = {
        firstname: "Weak",
        surname: "One",
        stats: { power: 3, speed: 3, technique: 3 }
      };
      const stronger2 = {
        firstname: "Strong",
        surname: "Two",
        stats: { power: 8, speed: 8, technique: 8 }
      };
      const diffs = calculateStatDifferences(stronger1, stronger2);
      const summary = generateComparisonSummary(stronger1, stronger2, diffs);
      expect(summary.winner).toContain("Strong Two");
      expect(summary.margin).toBeGreaterThan(0);
    });

    it("should calculate correct margin", () => {
      // judoka1 total: 9+7+8 = 24
      // judoka2 total: 6+8+7 = 21
      // margin = 24 - 21 = 3
      const summary = generateComparisonSummary(judoka1, judoka2, differences);
      expect(summary.margin).toBe(3);
    });

    it("should identify tied judoka", () => {
      const tied1 = { stats: { power: 5, speed: 5, technique: 5 } };
      const tied2 = { stats: { power: 5, speed: 5, technique: 5 } };
      const diffs = calculateStatDifferences(tied1, tied2);
      const summary = generateComparisonSummary(tied1, tied2, diffs);
      expect(summary.winner).toBe("Tied");
      expect(summary.margin).toBe(0);
    });

    it("should list advantages correctly", () => {
      const summary = generateComparisonSummary(judoka1, judoka2, differences);
      expect(summary.advantages).toContain("power");
      expect(summary.advantages).toContain("technique");
    });

    it("should list disadvantages correctly", () => {
      const summary = generateComparisonSummary(judoka1, judoka2, differences);
      expect(summary.disadvantages).toContain("speed");
    });

    it("should include both judoka totals", () => {
      const summary = generateComparisonSummary(judoka1, judoka2, differences);
      expect(summary.judoka1Total).toBe(24);
      expect(summary.judoka2Total).toBe(21);
    });
  });
});

describe("judokaComparison - Report Formatting", () => {
  let judoka1;
  let judoka2;

  beforeEach(() => {
    judoka1 = {
      id: 0,
      firstname: "Tatsuuma",
      surname: "Ushiyama",
      country: "Vanuatu",
      rarity: "Legendary",
      weightClass: "+100",
      stats: { power: 9, speed: 8, technique: 7 }
    };

    judoka2 = {
      id: 1,
      firstname: "Mystery",
      surname: "Judoka",
      country: "Bhutan",
      rarity: "Common",
      weightClass: "-60",
      stats: { power: 6, speed: 9, technique: 8 }
    };
  });

  describe("formatComparisonReport", () => {
    it("should include comparison title", () => {
      const report = formatComparisonReport(judoka1, judoka2);
      expect(report.title).toContain("Tatsuuma Ushiyama");
      expect(report.title).toContain("Mystery Judoka");
      expect(report.title).toContain("vs");
    });

    it("should include judoka1 info", () => {
      const report = formatComparisonReport(judoka1, judoka2);
      expect(report.judoka1Info).toContain("Tatsuuma Ushiyama");
      expect(report.judoka1Info).toContain("Vanuatu");
      expect(report.judoka1Info).toContain("Legendary");
    });

    it("should include judoka2 info", () => {
      const report = formatComparisonReport(judoka1, judoka2);
      expect(report.judoka2Info).toContain("Mystery Judoka");
      expect(report.judoka2Info).toContain("Bhutan");
      expect(report.judoka2Info).toContain("Common");
    });

    it("should include comparison text for winner", () => {
      const report = formatComparisonReport(judoka1, judoka2);
      expect(report.comparisonText).toContain("advantage");
    });

    it("should include ranked differences", () => {
      const report = formatComparisonReport(judoka1, judoka2);
      expect(Array.isArray(report.rankedDifferences)).toBe(true);
      expect(report.rankedDifferences.length).toBeGreaterThan(0);
    });

    it("should include stat details", () => {
      const report = formatComparisonReport(judoka1, judoka2);
      expect(report.statDetails.power).toContain("9 vs 6");
      expect(report.statDetails.speed).toContain("8 vs 9");
    });

    it("should include summary object", () => {
      const report = formatComparisonReport(judoka1, judoka2);
      expect(report.summary).toBeDefined();
      expect(report.summary.winner).toBeDefined();
      expect(report.summary.margin).toBeDefined();
    });
  });
});

describe("judokaComparison - Documentation", () => {
  describe("getComparisonDocumentation", () => {
    it("should return documentation object", () => {
      const doc = getComparisonDocumentation();

      const expectedDocumentation = {
        description:
          "Compare two judoka by ID, showing stat differences, advantages, disadvantages, and overall match-up analysis",
        inputSchema: {
          type: "object",
          properties: {
            id1: {
              type: ["string", "number"],
              description: "First judoka ID"
            },
            id2: {
              type: ["string", "number"],
              description: "Second judoka ID"
            }
          },
          required: ["id1", "id2"]
        },
        outputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Comparison title" },
            judoka1Info: { type: "string", description: "First judoka basic info" },
            judoka2Info: { type: "string", description: "Second judoka basic info" },
            comparisonText: {
              type: "string",
              description: "Human-readable comparison summary"
            },
            summary: {
              type: "object",
              properties: {
                winner: { type: "string", description: "Winner or 'Tied'" },
                margin: { type: "number", description: "Stat advantage margin" },
                judoka1Total: { type: "number" },
                judoka2Total: { type: "number" },
                advantages: {
                  type: "array",
                  description: "Stats where judoka1 leads"
                },
                disadvantages: {
                  type: "array",
                  description: "Stats where judoka2 leads"
                }
              }
            },
            rankedDifferences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stat: { type: "string" },
                  difference: { type: "number" }
                }
              },
              description: "Stats ranked by largest differences"
            },
            statDetails: {
              type: "object",
              description: "Stat-by-stat comparison (val1 vs val2 [difference])"
            }
          }
        },
        examples: [
          {
            description: "Compare two judoka by ID",
            input: { id1: 0, id2: 5 },
            expectedOutput:
              "Comparison report showing winner, stat advantages/disadvantages, and detailed breakdown"
          },
          {
            description: "Compare string IDs",
            input: { id1: "42", id2: "18" },
            expectedOutput: "Same as numeric IDs (auto-converted)"
          }
        ]
      };

      expect(doc).toEqual(expectedDocumentation);
    });

    it("should include description", () => {
      const doc = getComparisonDocumentation();
      expect(doc.description).toBeDefined();
      expect(typeof doc.description).toBe("string");
    });

    it("should document the input schema", () => {
      const { inputSchema } = getComparisonDocumentation();

      const expectedProperties = {
        id1: { type: ["string", "number"], description: "First judoka ID" },
        id2: { type: ["string", "number"], description: "Second judoka ID" }
      };

      expect(inputSchema.type).toBe("object");
      expect(Object.keys(inputSchema.properties)).toEqual(Object.keys(expectedProperties));

      Object.entries(expectedProperties).forEach(([propertyName, expectedDefinition]) => {
        const propertySchema = inputSchema.properties[propertyName];
        expect(propertySchema.type).toEqual(expectedDefinition.type);
        expect(propertySchema.description).toBe(expectedDefinition.description);
      });

      expect(inputSchema.required).toEqual(["id1", "id2"]);
    });

    it("should include output schema", () => {
      const doc = getComparisonDocumentation();
      expect(doc.outputSchema).toBeDefined();
      expect(doc.outputSchema.properties).toBeDefined();
    });

    it("should include examples", () => {
      const doc = getComparisonDocumentation();
      expect(Array.isArray(doc.examples)).toBe(true);
      expect(doc.examples.length).toBeGreaterThan(0);
    });

    it("should have valid example structure", () => {
      const doc = getComparisonDocumentation();
      doc.examples.forEach((example) => {
        expect(example.description).toBeDefined();
        expect(example.input).toBeDefined();
        expect(example.expectedOutput).toBeDefined();
      });
    });
  });
});

describe("judokaComparison - Integration", () => {
  it("should handle full comparison workflow", () => {
    const judoka1 = {
      id: 0,
      firstname: "Fighter",
      surname: "One",
      country: "Japan",
      rarity: "Legendary",
      weightClass: "+100",
      stats: { power: 8, speed: 7, technique: 8 }
    };

    const judoka2 = {
      id: 1,
      firstname: "Fighter",
      surname: "Two",
      country: "Brazil",
      rarity: "Epic",
      weightClass: "-60",
      stats: { power: 7, speed: 8, technique: 7 }
    };

    // Validate IDs
    const idsValid = validateComparisonIds(judoka1.id, judoka2.id);
    expect(idsValid.valid).toBe(true);

    // Validate records
    const recordsValid = validateJudokaForComparison(judoka1, judoka2);
    expect(recordsValid.valid).toBe(true);

    // Calculate differences
    const diffs = calculateStatDifferences(judoka1, judoka2);
    expect(diffs.totalAbsoluteDiff).toBeGreaterThan(0);

    // Generate report
    const report = formatComparisonReport(judoka1, judoka2);
    expect(report.title).toBeDefined();
    expect(report.summary).toBeDefined();
  });
});

describe("judokaComparison - Edge Cases", () => {
  it("should handle judoka with only one stat", () => {
    const single1 = { stats: { power: 9 } };
    const single2 = { stats: { power: 5 } };
    const diffs = calculateStatDifferences(single1, single2);
    expect(diffs.statDifferences.power).toBe(4);
  });

  it("should handle large stat values", () => {
    const large1 = { stats: { power: 1000 } };
    const large2 = { stats: { power: 1 } };
    const diffs = calculateStatDifferences(large1, large2);
    expect(diffs.statDifferences.power).toBe(999);
  });

  it("should handle negative stat differences", () => {
    const weak1 = { stats: { power: 1 } };
    const strong2 = { stats: { power: 10 } };
    const diffs = calculateStatDifferences(weak1, strong2);
    expect(diffs.statDifferences.power).toBe(-9);
    expect(diffs.totalAbsoluteDiff).toBe(9);
  });

  it("should handle many stats", () => {
    const many1 = {
      stats: {
        power: 1,
        speed: 2,
        technique: 3,
        kumikata: 4,
        newaza: 5,
        custom1: 6,
        custom2: 7,
        custom3: 8
      }
    };
    const many2 = {
      stats: {
        power: 2,
        speed: 3,
        technique: 4,
        kumikata: 5,
        newaza: 6,
        custom1: 7,
        custom2: 8,
        custom3: 9
      }
    };
    const diffs = calculateStatDifferences(many1, many2);
    expect(diffs.statCount).toBe(8);
    expect(diffs.totalAbsoluteDiff).toBe(8);
  });
});
