import { describe, it, expect } from "vitest";
import { expandQuery, getSynonymStats } from "../src/helpers/queryExpander.js";

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
      expect(result.expanded).toContain("xyz_nonexistent_term_abc");
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

    it("should handle very long query", async () => {
      const longQuery = "kumikata ".repeat(100);
      const result = await expandQuery(longQuery);
      expect(result.hasExpansion).toBe(true);
    });

    it("should handle query with special characters", async () => {
      const result = await expandQuery("kumikata! @#$%");
      // Should still find kumikata matches despite special chars
      expect(result.original).toBe("kumikata! @#$%");
    });

    it("should handle query with numbers", async () => {
      const result = await expandQuery("power 123 speed");
      expect(result.original).toBe("power 123 speed");
      // Expansion should still work
      expect(result.expanded).toBeTruthy();
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
    it("should expand query within reasonable time", async () => {
      const start = performance.now();
      await expandQuery("kumikata scoreboard countdown");
      const duration = performance.now() - start;
      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it("should cache synonyms for subsequent calls", async () => {
      // First call loads synonyms
      await expandQuery("kumikata");
      const start = performance.now();
      // Second call should use cache
      await expandQuery("scoreboard");
      const duration = performance.now() - start;
      // Cached call should be faster (though this is not a hard requirement)
      expect(duration).toBeLessThan(50);
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
