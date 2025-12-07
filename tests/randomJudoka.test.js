import { describe, it, expect, vi } from "vitest";
import {
  validateRandomFilters,
  filterJudokaByFilters,
  selectRandomElement,
  selectRandomJudoka,
  getRandomJudokaWithMetadata,
  getAvailableFilterOptions,
  getRandomSelectionDocumentation,
  RANDOM_SELECTION_DOCUMENTATION
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

const multiplier = 1103515245;
const increment = 12345;
const modulus = 2 ** 31;

const createSeededRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state * multiplier + increment) % modulus;
    return state / modulus;
  };
};

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

    it("should allow RNG objects with random method for deterministic selection", () => {
      const seed = 1337;
      const predictorRng = createSeededRng(seed);
      const expectedFirstRandomValue = predictorRng();
      const rngObject = { random: vi.fn(createSeededRng(seed)) };

      const array = ["alpha", "beta", "gamma", "delta"];
      const result = selectRandomElement(array, rngObject);

      expect(rngObject.random).toHaveBeenCalledTimes(1);
      const expectedIndex = Math.floor(expectedFirstRandomValue * array.length);
      expect(result).toBe(array[expectedIndex]);
    });

    it("should support deterministic selection across heterogeneous arrays", () => {
      const heterogeneous = [1, "two", { three: 3 }, null, undefined];
      const seededRng = createSeededRng(2024);
      const expectedValue = createSeededRng(2024)();
      const expectedIndex = Math.floor(expectedValue * heterogeneous.length);

      const selection = selectRandomElement(heterogeneous, seededRng);

      expect(selection).toBe(heterogeneous[expectedIndex]);
    });

    it("should throw when rng returns invalid values", () => {
      const array = ["only", "two"];

      expect(() => selectRandomElement(array, () => NaN)).toThrow(/finite number within \[0, 1\)/);
      expect(() => selectRandomElement(array, { random: () => 1.2 })).toThrow(
        /finite number within \[0, 1\)/
      );
      expect(() => selectRandomElement(array, null)).toThrow(
        /requires a function or object with a random\(\) method/
      );
      expect(() => selectRandomElement(array, undefined)).toThrow(
        /requires a function or object with a random\(\) method/
      );
      expect(() => selectRandomElement(array, {})).toThrow(
        /requires a function or object with a random\(\) method/
      );
    });

    it("should select deterministic index with seeded RNG", () => {
      const seed = 9876;
      // Use a separate RNG instance to predict the first value
      const predictorRng = createSeededRng(seed);
      const expectedFirstRandomValue = predictorRng();

      // Create a fresh RNG for the test and wrap it with a spy
      const rngForTest = createSeededRng(seed);
      const testRngSpy = vi.fn(rngForTest);

      const array = ["alpha", "beta", "gamma", "delta"];
      const result = selectRandomElement(array, testRngSpy);

      // Assertions
      expect(testRngSpy).toHaveBeenCalledTimes(1);
      expect(testRngSpy).toHaveReturnedWith(expectedFirstRandomValue);
      const expectedIndex = Math.floor(expectedFirstRandomValue * array.length);
      expect(result).toBe(array[expectedIndex]);
    });

    it("should avoid index bias across rng extremes", () => {
      const array = ["first", "middle", "last"];
      const rngSequence = [0, 0.999999, 0.4];
      let callCount = 0;
      const rng = vi.fn(() => {
        if (callCount >= rngSequence.length) {
          throw new Error(
            `RNG called more times than expected (${callCount + 1} > ${rngSequence.length})`
          );
        }
        return rngSequence[callCount++];
      });

      const firstSelection = selectRandomElement(array, rng);
      const lastSelection = selectRandomElement(array, rng);
      const middleSelection = selectRandomElement(array, rng);

      expect([firstSelection, lastSelection, middleSelection]).toEqual(["first", "last", "middle"]);
      expect(rng).toHaveBeenCalledTimes(3);
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
    it("should match the documented schema", () => {
      const expectedDocumentation = JSON.parse(JSON.stringify(RANDOM_SELECTION_DOCUMENTATION));
      const result = getRandomSelectionDocumentation();

      expect(result).toEqual(expectedDocumentation);
    });

    it("should have description string", () => {
      const result = getRandomSelectionDocumentation();
      expect(typeof result.description).toBe("string");
      expect(result.description.length).toBeGreaterThan(0);
    });

    it("should describe supported filters and response metadata", () => {
      const { description } = getRandomSelectionDocumentation();

      expect(description).toMatch(/country/i);
      expect(description).toMatch(/rarity/i);
      expect(description).toMatch(/weight\s*class/i);
      expect(description).toMatch(/metadata/i);
    });

    it("should have country filter documented", () => {
      const result = getRandomSelectionDocumentation();
      const { country: expectedCountryFilter } = RANDOM_SELECTION_DOCUMENTATION.filters;

      expect(result.filters.country.type).toBe(expectedCountryFilter.type);
      expect(result.filters.country.description).toBe(expectedCountryFilter.description);
      expect(result.filters.country.values ?? []).toEqual(expectedCountryFilter.values ?? []);
    });

    it("should have rarity filter with valid values", () => {
      const result = getRandomSelectionDocumentation();
      expect(result.filters.rarity.values).toContain("Common");
      expect(result.filters.rarity.values).toContain("Epic");
      expect(result.filters.rarity.values).toContain("Legendary");
    });

    it("should document examples that mirror real selection payloads", () => {
      const deterministicRandom = vi.spyOn(Math, "random").mockReturnValue(0.42);
      const exampleFilters = { country: "Japan", weightClass: "+100" };

      const generatedExample = getRandomJudokaWithMetadata(mockJudoka, exampleFilters);

      deterministicRandom.mockRestore();

      const result = getRandomSelectionDocumentation();
      const documentedExample = result.examples.find(
        (example) => example.description === "Select random heavyweight from Japan"
      );

      expect(documentedExample).toBeDefined();
      expect(documentedExample.input).toEqual({ filters: exampleFilters });
      expect(documentedExample.response).toEqual(generatedExample);
      expect(documentedExample.response).toMatchObject({
        filters: exampleFilters,
        totalCount: mockJudoka.length,
        matchCount: 1,
        judoka: expect.objectContaining({
          country: "Japan",
          rarity: "Legendary",
          weightClass: "+100"
        })
      });
    });

    it("should have response format documented", () => {
      const result = getRandomSelectionDocumentation();
      const { responseFormat } = result;
      const expectedResponseFormat = RANDOM_SELECTION_DOCUMENTATION.responseFormat;

      expect(Object.keys(responseFormat).sort()).toEqual(
        Object.keys(expectedResponseFormat).sort()
      );
      expect(responseFormat).toEqual(expectedResponseFormat);
      expect(responseFormat.judoka.length).toBeGreaterThan(0);
      expect(responseFormat.filters.length).toBeGreaterThan(0);
      expect(responseFormat.totalCount.length).toBeGreaterThan(0);
      expect(responseFormat.matchCount.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases and Integration", () => {
    let randomSpy;

    beforeEach(() => {
      randomSpy = vi.spyOn(Math, "random");
    });

    afterEach(() => {
      randomSpy.mockRestore();
    });

    it("should handle judoka with missing country", () => {
      const incomplete = [{ ...mockJudoka[0], country: undefined }];
      const result = getAvailableFilterOptions(incomplete);
      expect(result.countries.length).toBeLessThanOrEqual(1);
    });

    it("should select from full dataset correctly", () => {
      randomSpy
        .mockReturnValueOnce(0.05) // selects first judoka (index 0)
        .mockReturnValueOnce(0.4) // selects third judoka (index 2)
        .mockReturnValueOnce(0.6); // selects second filtered judoka (index 1 of Japanese judoka)

      const firstSelection = selectRandomJudoka(mockJudoka);
      const secondSelection = selectRandomJudoka(mockJudoka);
      const filteredSelection = selectRandomJudoka(mockJudoka, { country: "Japan" });

      expect(firstSelection).toEqual(mockJudoka[0]);
      expect(secondSelection).toEqual(mockJudoka[2]);
      expect(filteredSelection).toEqual(mockJudoka[3]);
      expect(randomSpy).toHaveBeenCalledTimes(3);
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
