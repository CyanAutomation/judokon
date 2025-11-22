import { describe, it, expect, vi } from "vitest";
import {
  MAX_QUERY_LENGTH,
  MAX_QUERY_TERMS,
  expandQuery,
  getSynonymStats
} from "../src/helpers/queryExpander.js";

describe("Query Expansion", () => {
  describe("Basic Query Expansion", () => {
    it("should expand query with matching synonyms", async () => {
      const result = await expandQuery("kumikata grip");
      expect(result.original).toBe("kumikata grip");
      expect(result.hasExpansion).toBe(true);
      expect(result.addedTerms).toContain("kumi-kata");
      expect(result.addedTerms).toContain("grip fighting");
    });

    it("should handle empty query", async () => {
      const result = await expandQuery("");
      expect(result.original).toBe("");
      expect(result.expanded).toBe("");
      expect(result.hasExpansion).toBe(false);
      expect(result.addedTerms).toHaveLength(0);
    });

    it("should handle null query", async () => {
      const result = await expandQuery(null);
      expect(result.original).toBe("");
      expect(result.expanded).toBe("");
      expect(result.hasExpansion).toBe(false);
    });

    it("should preserve original query in expanded result", async () => {
      const result = await expandQuery("scoreboard");
      expect(result.expanded).toContain("scoreboard");
      expect(result.original).toBe("scoreboard");
    });

    it("should handle query with no matching synonyms", async () => {
      const result = await expandQuery("xyz_nonexistent_term_abc");
      expect(result.hasExpansion).toBe(false);
      expect(result.addedTerms).toHaveLength(0);
      expect(result.expanded).toBe("xyz nonexistent term abc");
      expect(result.original).toBe("xyz_nonexistent_term_abc");
    });
  });

  describe("Fuzzy Matching (Levenshtein Distance)", () => {
    it("should match terms with typos (distance <= 2)", async () => {
      // "kumikata" is close to "kumi kata" (1 edit: space)
      const result = await expandQuery("kumikata");
      expect(result.hasExpansion).toBe(true);
      expect(result.addedTerms.length).toBeGreaterThan(0);
    });

    it("should match 'count down' (space) to 'countdown'", async () => {
      const result = await expandQuery("count down");
      expect(result.hasExpansion).toBe(true);
      expect(result.addedTerms).toContain("countdown");
      expect(result.addedTerms).toContain("timer");
    });

    it("should match abbreviated terms like 'nav bar'", async () => {
      const result = await expandQuery("nav bar");
      expect(result.hasExpansion).toBe(true);
      expect(result.addedTerms).toContain("navigation bar");
    });
  });

  describe("Multi-term Expansion", () => {
    it("should expand multiple synonyms in one query", async () => {
      const result = await expandQuery("kumikata scoreboard countdown");
      expect(result.addedTerms.length).toBeGreaterThan(0);
      // Should have expansions for at least 2 of the 3 terms
      const expanded = result.expanded.toLowerCase();
      expect(expanded).toContain("scoreboard");
    });

    it("should deduplicate terms in expanded query", async () => {
      const result = await expandQuery("kumikata kumi kata");
      const terms = result.expanded.split(/\s+/);
      const uniqueTerms = new Set(terms);
      expect(terms.length).toBe(uniqueTerms.size);
    });

    it("should handle mixed case input", async () => {
      const result = await expandQuery("KUMIKATA Grip FIGHTING");
      expect(result.hasExpansion).toBe(true);
      // Expanded should be lowercase
      expect(result.expanded).toBe(result.expanded.toLowerCase());
    });
  });

  describe("Expansion Statistics", () => {
    it("should track number of added terms", async () => {
      const result = await expandQuery("kumikata scoreboard");
      expect(result.synonymsUsed).toBe(result.addedTerms.length);
      expect(result.synonymsUsed).toBeGreaterThan(0);
    });

    it("should return empty addedTerms for non-matching query", async () => {
      const result = await expandQuery("random query with no matches");
      expect(result.addedTerms).toHaveLength(0);
      expect(result.synonymsUsed).toBe(0);
      expect(result.hasExpansion).toBe(false);
    });

    it("should provide accurate statistics", async () => {
      const result = await expandQuery("kumikata");
      expect(result).toHaveProperty("original");
      expect(result).toHaveProperty("expanded");
      expect(result).toHaveProperty("addedTerms");
      expect(result).toHaveProperty("synonymsUsed");
      expect(result).toHaveProperty("hasExpansion");
    });
  });

  describe("Synonym Statistics Endpoint", () => {
    it("should return synonym statistics", async () => {
      const stats = await getSynonymStats();
      expect(stats.totalMappings).toBeGreaterThan(0);
      expect(stats.totalSynonyms).toBeGreaterThan(0);
      expect(parseFloat(stats.averageSynonymsPerMapping)).toBeGreaterThan(0);
      expect(stats.mappingExamples).toBeInstanceOf(Array);
      expect(stats.mappingExamples.length).toBeLessThanOrEqual(3);
    });

    it("should include examples of mappings", async () => {
      const stats = await getSynonymStats();
      if (stats.mappingExamples.length > 0) {
        const example = stats.mappingExamples[0];
        expect(example).toHaveProperty("key");
        expect(example).toHaveProperty("synonyms");
        expect(example.synonyms).toBeInstanceOf(Array);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle single character query", async () => {
      const result = await expandQuery("a");
      expect(result.original).toBe("a");
      expect(result.expanded).toBeTruthy();
    });

    it("should clamp very long queries to a predictable size", async () => {
      const longQuery = Array.from({ length: MAX_QUERY_TERMS + 5 }, (_, idx) => `term${idx}`).join(
        " "
      );
      const result = await expandQuery(longQuery);
      const terms = result.expanded.split(/\s+/);

      expect(terms.length).toBe(MAX_QUERY_TERMS);
      expect(terms.at(-1)).toBe(`term${MAX_QUERY_TERMS - 1}`);
      expect(result.original).toBe(longQuery);
    });

    it("should handle query with special characters", async () => {
      const result = await expandQuery("kumikata! @#$%");
      // Should strip punctuation from expansion while preserving the original input
      expect(result.expanded).not.toContain("!");
      expect(result.expanded).not.toContain("@");
      expect(result.expanded).not.toContain("#");
      expect(result.expanded).not.toContain("$");
      expect(result.expanded).not.toContain("%");
      expect(result.expanded).toContain("kumikata");
      expect(result.hasExpansion).toBe(true);
      expect(result.original).toBe("kumikata! @#$%");
    });

    it("should handle query with numbers", async () => {
      const result = await expandQuery("power 123 speed");
      expect(result.original).toBe("power 123 speed");
      // Expansion should still work
      expect(result.expanded).toBeTruthy();
    });

    it("should trim extremely long single-token queries", async () => {
      const longToken = "x".repeat(MAX_QUERY_LENGTH + 20);
      const result = await expandQuery(longToken);

      expect(result.expanded.length).toBe(MAX_QUERY_LENGTH);
      expect(result.expanded).toBe(result.expanded.toLowerCase());
    });

    it("should truncate multi-word queries on word boundaries", async () => {
      const longTokens = Array.from({ length: MAX_QUERY_TERMS }, (_, idx) => `longtoken${idx}long`);
      const longQuery = longTokens.join(" ");
      const result = await expandQuery(longQuery);
      const expandedTokens = result.expanded.split(/\s+/).filter(Boolean);

      // Verify that all expanded tokens are either from original tokens or added synonyms
      const originalTokensSet = new Set(longTokens);
      const addedTermsSet = new Set(result.addedTerms);
      expect(
        expandedTokens.every((token) => originalTokensSet.has(token) || addedTermsSet.has(token))
      ).toBe(true);
      expect(result.expanded.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
    });

    it("should handle repeated words", async () => {
      const result = await expandQuery("kumikata kumikata kumikata");
      const terms = result.expanded.split(/\s+/);
      const uniqueTerms = new Set(terms);
      // Should deduplicate
      expect(terms.length).toBeLessThanOrEqual(uniqueTerms.size + 1);
    });
  });

  describe("Performance", () => {
    it("should bound expansion size for verbose inputs", async () => {
      const fillerTerms = Array.from({ length: MAX_QUERY_TERMS + 20 }, (_, idx) => `filler${idx}`);
      const verboseQuery = ["kumikata grip", ...fillerTerms].join(" ");
      const result = await expandQuery(verboseQuery);
      const addedLength = result.addedTerms.join(" ").length;

      const fillerTermCount = result.expanded
        .split(/\s+/)
        .filter((term) => term.startsWith("filler")).length;

      expect(fillerTermCount).toBe(MAX_QUERY_TERMS - 2); // -2 for "kumikata" and "grip"
      expect(result.expanded.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH + addedLength);
      expect(result.addedTerms).toContain("kumi-kata");
    });

    it("should cache synonyms for subsequent calls", async () => {
      vi.resetModules();
      const dataUtils = await import("../src/helpers/dataUtils.js");
      const fetchSpy = vi.spyOn(dataUtils, "fetchJson");
      const { expandQuery: freshExpandQuery } = await import("../src/helpers/queryExpander.js");

      await freshExpandQuery("kumikata");
      const afterFirstLoad = fetchSpy.mock.calls.length;
      await freshExpandQuery("scoreboard");

      expect(fetchSpy.mock.calls.length).toBe(afterFirstLoad);
    });
  });

  describe("Integration with Search Workflow", () => {
    it("should expand query suitable for embedding", async () => {
      const result = await expandQuery("kumikata grip fight");
      // Expanded query should be usable as embedding input
      expect(typeof result.expanded).toBe("string");
      expect(result.expanded.length).toBeGreaterThan(0);
      expect(result.expanded).not.toContain("  "); // No double spaces
    });

    it("should provide original for display purposes", async () => {
      const query = "My search for kumikata";
      const result = await expandQuery(query);
      expect(result.original).toBe(query);
      // Original should be preserved exactly
    });

    it("should indicate when expansion occurred", async () => {
      const noExpansion = await expandQuery("xyz_no_match");
      const withExpansion = await expandQuery("kumikata");
      expect(withExpansion.hasExpansion).toBe(true);
      expect(noExpansion.hasExpansion).toBe(false);
    });
  });
});
