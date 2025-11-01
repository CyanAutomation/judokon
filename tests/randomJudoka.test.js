import { describe, it, expect } from "vitest";
import {
  validateRandomFilters,
  filterJudokaByFilters,
  selectRandomElement,
  selectRandomJudoka,
  getRandomJudokaWithMetadata,
  getAvailableFilterOptions,
  getRandomSelectionDocumentation
} from "../src/helpers/randomJudoka.js";

// Test data
const mockJudoka = [
  {
    id: 0,
    firstname: "Tatsuuma",
    surname: "Ushiyama",
    country: "Vanuatu",
    rarity: "Legendary",
    weightClass: "+100"
  },
  {
    id: 1,
    firstname: "Yuki",
    surname: "Tanaka",
    country: "Japan",
    rarity: "Epic",
    weightClass: "-60"
  },
  {
    id: 2,
    firstname: "Marcel",
    surname: "Dupont",
    country: "France",
    rarity: "Common",
    weightClass: "+100"
  },
  {
    id: 3,
    firstname: "Kenji",
    surname: "Yamamoto",
    country: "Japan",
    rarity: "Legendary",
    weightClass: "+100"
  },
  {
    id: 4,
    firstname: "Ana",
    surname: "Silva",
    country: "Brazil",
    rarity: "Epic",
    weightClass: "-60"
  }
];

describe("Random Judoka Selection", () => {
  describe("validateRandomFilters", () => {
    it("should return empty object if filters is null", () => {
      const result = validateRandomFilters(null);
      expect(result).toEqual({});
    });

    it("should return empty object if filters is undefined", () => {
      const result = validateRandomFilters(undefined);
      expect(result).toEqual({});
    });

    it("should accept valid country filter", () => {
      const result = validateRandomFilters({ country: "Japan" });
      expect(result).toEqual({ country: "Japan" });
    });

    it("should accept valid rarity filter", () => {
      const result = validateRandomFilters({ rarity: "Legendary" });
      expect(result).toEqual({ rarity: "Legendary" });
    });

    it("should reject invalid rarity", () => {
      const result = validateRandomFilters({ rarity: "InvalidRarity" });
      expect(result).toEqual({});
    });

    it("should accept valid weight class filter", () => {
      const result = validateRandomFilters({ weightClass: "+100" });
      expect(result).toEqual({ weightClass: "+100" });
    });

    it("should handle multiple valid filters", () => {
      const result = validateRandomFilters({
        country: "Japan",
        rarity: "Legendary",
        weightClass: "+100"
      });
      expect(result).toEqual({
        country: "Japan",
        rarity: "Legendary",
        weightClass: "+100"
      });
    });

    it("should trim whitespace from country filter", () => {
      const result = validateRandomFilters({ country: "  Japan  " });
      expect(result).toEqual({ country: "Japan" });
    });

    it("should reject non-string country", () => {
      const result = validateRandomFilters({ country: 123 });
      expect(result).toEqual({});
    });

    it("should return all three rarity values", () => {
      const rarities = ["Common", "Epic", "Legendary"];
      for (const rarity of rarities) {
        const result = validateRandomFilters({ rarity });
        expect(result).toEqual({ rarity });
      }
    });
  });

  describe("filterJudokaByFilters", () => {
    it("should return all judoka if no filters", () => {
      const result = filterJudokaByFilters(mockJudoka, {});
      expect(result).toHaveLength(5);
      expect(result).toEqual(mockJudoka);
    });

    it("should return empty array if judoka array is empty", () => {
      const result = filterJudokaByFilters([], {});
      expect(result).toEqual([]);
    });

    it("should filter by country", () => {
      const result = filterJudokaByFilters(mockJudoka, { country: "Japan" });
      expect(result).toHaveLength(2);
      expect(result[0].firstname).toBe("Yuki");
      expect(result[1].firstname).toBe("Kenji");
    });

    it("should filter by rarity", () => {
      const result = filterJudokaByFilters(mockJudoka, { rarity: "Legendary" });
      expect(result).toHaveLength(2);
      expect(result[0].firstname).toBe("Tatsuuma");
      expect(result[1].firstname).toBe("Kenji");
    });

    it("should filter by weight class", () => {
      const result = filterJudokaByFilters(mockJudoka, { weightClass: "+100" });
      expect(result).toHaveLength(3);
      expect(result.map((j) => j.surname)).toEqual(["Ushiyama", "Dupont", "Yamamoto"]);
    });

    it("should apply multiple filters (AND logic)", () => {
      const result = filterJudokaByFilters(mockJudoka, {
        country: "Japan",
        rarity: "Legendary"
      });
      expect(result).toHaveLength(1);
      expect(result[0].firstname).toBe("Kenji");
    });

    it("should return empty array if no matches", () => {
      const result = filterJudokaByFilters(mockJudoka, {
        country: "Nonexistent"
      });
      expect(result).toHaveLength(0);
    });

    it("should apply all three filters together", () => {
      const result = filterJudokaByFilters(mockJudoka, {
        country: "Japan",
        rarity: "Legendary",
        weightClass: "+100"
      });
      expect(result).toHaveLength(1);
      expect(result[0].firstname).toBe("Kenji");
    });
  });

  describe("selectRandomElement", () => {
    it("should return null for empty array", () => {
      const result = selectRandomElement([]);
      expect(result).toBeNull();
    });

    it("should return null for null array", () => {
      const result = selectRandomElement(null);
      expect(result).toBeNull();
    });

    it("should return single element from array of 1", () => {
      const result = selectRandomElement([42]);
      expect(result).toBe(42);
    });

    it("should return element from array", () => {
      const array = ["a", "b", "c"];
      const result = selectRandomElement(array);
      expect(array).toContain(result);
    });

    it("should return element from judoka array", () => {
      const result = selectRandomElement(mockJudoka);
      expect(mockJudoka).toContain(result);
    });

    it("should handle various element types", () => {
      const mixed = [1, "string", { obj: true }, null];
      const result = selectRandomElement(mixed);
      expect(mixed).toContain(result);
    });
  });

  describe("selectRandomJudoka", () => {
    it("should return null if judoka array is empty", () => {
      const result = selectRandomJudoka([], {});
      expect(result).toBeNull();
    });

    it("should return null if judoka array is null", () => {
      const result = selectRandomJudoka(null, {});
      expect(result).toBeNull();
    });

    it("should return a random judoka from array", () => {
      const result = selectRandomJudoka(mockJudoka);
      expect(mockJudoka).toContain(result);
    });

    it("should return null if no filters match", () => {
      const result = selectRandomJudoka(mockJudoka, { country: "Nonexistent" });
      expect(result).toBeNull();
    });

    it("should return random judoka from filtered set", () => {
      const result = selectRandomJudoka(mockJudoka, { country: "Japan" });
      expect(result).not.toBeNull();
      expect(result.country).toBe("Japan");
    });

    it("should handle multiple filters", () => {
      const result = selectRandomJudoka(mockJudoka, {
        country: "Japan",
        rarity: "Legendary"
      });
      expect(result).not.toBeNull();
      expect(result.country).toBe("Japan");
      expect(result.rarity).toBe("Legendary");
    });

    it("should handle no filters", () => {
      const result = selectRandomJudoka(mockJudoka);
      expect(mockJudoka).toContain(result);
    });
  });

  describe("getRandomJudokaWithMetadata", () => {
    it("should return null if judoka array is empty", () => {
      const result = getRandomJudokaWithMetadata([], {});
      expect(result).toBeNull();
    });

    it("should return metadata object with judoka", () => {
      const result = getRandomJudokaWithMetadata(mockJudoka);
      expect(result).toHaveProperty("judoka");
      expect(result).toHaveProperty("filters");
      expect(result).toHaveProperty("totalCount");
      expect(result).toHaveProperty("matchCount");
    });

    it("should have correct total count", () => {
      const result = getRandomJudokaWithMetadata(mockJudoka);
      expect(result.totalCount).toBe(5);
    });

    it("should have correct match count without filters", () => {
      const result = getRandomJudokaWithMetadata(mockJudoka);
      expect(result.matchCount).toBe(5);
    });

    it("should have correct match count with filters", () => {
      const result = getRandomJudokaWithMetadata(mockJudoka, {
        country: "Japan"
      });
      expect(result.matchCount).toBe(2);
    });

    it("should have selected judoka in results", () => {
      const result = getRandomJudokaWithMetadata(mockJudoka);
      expect(mockJudoka).toContain(result.judoka);
    });

    it("should include applied filters in metadata", () => {
      const result = getRandomJudokaWithMetadata(mockJudoka, {
        country: "France"
      });
      expect(result.filters).toEqual({ country: "France" });
    });

    it("should return null if no matches found", () => {
      const result = getRandomJudokaWithMetadata(mockJudoka, {
        country: "Nonexistent"
      });
      expect(result).toBeNull();
    });
  });

  describe("getAvailableFilterOptions", () => {
    it("should return empty arrays for empty judoka array", () => {
      const result = getAvailableFilterOptions([]);
      expect(result).toEqual({
        countries: [],
        rarities: [],
        weightClasses: []
      });
    });

    it("should return all countries", () => {
      const result = getAvailableFilterOptions(mockJudoka);
      expect(result.countries).toContain("Japan");
      expect(result.countries).toContain("Vanuatu");
      expect(result.countries).toContain("France");
      expect(result.countries).toContain("Brazil");
    });

    it("should return all rarities", () => {
      const result = getAvailableFilterOptions(mockJudoka);
      expect(result.rarities).toContain("Legendary");
      expect(result.rarities).toContain("Epic");
      expect(result.rarities).toContain("Common");
    });

    it("should return all weight classes", () => {
      const result = getAvailableFilterOptions(mockJudoka);
      expect(result.weightClasses).toContain("+100");
      expect(result.weightClasses).toContain("-60");
    });

    it("should have sorted countries", () => {
      const result = getAvailableFilterOptions(mockJudoka);
      expect(result.countries).toEqual([...result.countries].sort());
    });

    it("should have sorted rarities", () => {
      const result = getAvailableFilterOptions(mockJudoka);
      expect(result.rarities).toEqual([...result.rarities].sort());
    });

    it("should have sorted weight classes", () => {
      const result = getAvailableFilterOptions(mockJudoka);
      expect(result.weightClasses).toEqual([...result.weightClasses].sort());
    });

    it("should not have duplicates", () => {
      const duplicateJudoka = [...mockJudoka, mockJudoka[0], mockJudoka[1]];
      const result = getAvailableFilterOptions(duplicateJudoka);
      expect(new Set(result.countries).size).toBe(result.countries.length);
    });

    it("should return null for null input", () => {
      const result = getAvailableFilterOptions(null);
      expect(result).toEqual({
        countries: [],
        rarities: [],
        weightClasses: []
      });
    });
  });

  describe("getRandomSelectionDocumentation", () => {
    it("should return documentation object", () => {
      const result = getRandomSelectionDocumentation();
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("filters");
      expect(result).toHaveProperty("examples");
      expect(result).toHaveProperty("responseFormat");
    });

    it("should have description string", () => {
      const result = getRandomSelectionDocumentation();
      expect(typeof result.description).toBe("string");
      expect(result.description.length).toBeGreaterThan(0);
    });

    it("should have country filter documented", () => {
      const result = getRandomSelectionDocumentation();
      expect(result.filters).toHaveProperty("country");
      expect(result.filters.country).toHaveProperty("description");
      expect(result.filters.country).toHaveProperty("type");
    });

    it("should have rarity filter with valid values", () => {
      const result = getRandomSelectionDocumentation();
      expect(result.filters.rarity.values).toContain("Common");
      expect(result.filters.rarity.values).toContain("Epic");
      expect(result.filters.rarity.values).toContain("Legendary");
    });

    it("should have examples array", () => {
      const result = getRandomSelectionDocumentation();
      expect(Array.isArray(result.examples)).toBe(true);
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it("should have response format documented", () => {
      const result = getRandomSelectionDocumentation();
      expect(result.responseFormat).toHaveProperty("judoka");
      expect(result.responseFormat).toHaveProperty("filters");
      expect(result.responseFormat).toHaveProperty("totalCount");
      expect(result.responseFormat).toHaveProperty("matchCount");
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle judoka with missing country", () => {
      const incomplete = [{ ...mockJudoka[0], country: undefined }];
      const result = getAvailableFilterOptions(incomplete);
      expect(result.countries.length).toBeLessThanOrEqual(1);
    });

    it("should select from full dataset correctly", () => {
      const result = selectRandomJudoka(mockJudoka);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.country).toBeDefined();
    });

    it("should work with single judoka", () => {
      const single = [mockJudoka[0]];
      const result = selectRandomJudoka(single);
      expect(result).toEqual(single[0]);
    });

    it("should validate all filter types together", () => {
      const filters = {
        country: "Japan",
        rarity: "Legendary",
        weightClass: "+100"
      };
      const validated = validateRandomFilters(filters);
      expect(Object.keys(validated)).toHaveLength(3);
    });

    it("should handle very large judoka array", () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        country: ["Japan", "France", "Brazil"][i % 3],
        rarity: ["Common", "Epic", "Legendary"][i % 3],
        weightClass: ["+100", "-60"][i % 2]
      }));
      const result = selectRandomJudoka(largeArray);
      expect(largeArray).toContain(result);
    });

    it("should maintain filter consistency", () => {
      const filters = { country: "Japan" };
      const result1 = selectRandomJudoka(mockJudoka, filters);
      const result2 = selectRandomJudoka(mockJudoka, filters);
      expect(result1.country).toBe("Japan");
      expect(result2.country).toBe("Japan");
    });
  });
});
