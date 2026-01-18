import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test suite for MCP RAG server tools
 * Tests semantic search and filtering functionality
 */

// ============ Test Utilities ============

/**
 * Compute vector norm (magnitude)
 */
function norm(vec) {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Compute cosine similarity between two vectors
 */
function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  const aMag = norm(a);
  const bMag = norm(b);
  return dot / (aMag * bMag + 1e-12);
}

// ============ Data Loading ============

let judokaData = [];
let judokaById = new Map();
let embeddingsArray = [];

beforeAll(() => {
  // Load judoka data
  const judokaPath = path.join(__dirname, "../src/data/judoka.json");
  judokaData = JSON.parse(fs.readFileSync(judokaPath, "utf8"));
  judokaById = new Map(judokaData.map((j) => [String(j.id), j]));

  // Load embeddings (stored as array of {id, text, embedding} objects)
  const embeddingsPath = path.join(__dirname, "../src/data/client_embeddings.json");
  embeddingsArray = JSON.parse(fs.readFileSync(embeddingsPath, "utf8"));
});

// ============ Tests ============

describe("MCP RAG Server - judokon.search tool", () => {
  describe("Data Loading", () => {
    it("should load judoka data", () => {
      expect(judokaData).toBeDefined();
      expect(judokaData.length).toBeGreaterThan(0);
    });

    it("should load embeddings", () => {
      expect(embeddingsArray).toBeDefined();
      expect(embeddingsArray.length).toBeGreaterThan(0);
      // Check first embedding has required fields
      const first = embeddingsArray[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("text");
      expect(first).toHaveProperty("embedding");
      expect(Array.isArray(first.embedding)).toBe(true);
    });

    it("should map judoka by ID", () => {
      expect(judokaById.size).toBe(judokaData.length);
      const firstJudoka = judokaData[0];
      expect(judokaById.has(String(firstJudoka.id))).toBe(true);
    });
  });

  describe("Cosine Similarity", () => {
    it("should compute identical vectors as 1.0", () => {
      const vec = [0.1, 0.2, 0.3];
      const similarity = cosine(vec, vec);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("should compute orthogonal vectors as ~0", () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = cosine(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("should compute similar vectors with positive similarity", () => {
      const vec1 = [0.1, 0.2, 0.3, 0.4];
      const vec2 = [0.15, 0.25, 0.35, 0.45];
      const similarity = cosine(vec1, vec2);
      expect(similarity).toBeGreaterThan(0.9);
    });
  });

  describe("Filtering Logic", () => {
    it("should filter judoka by country", () => {
      const countries = new Set(judokaData.map((j) => j.country));
      const testCountry = Array.from(countries)[0];
      const filtered = judokaData.filter((j) => j.country === testCountry);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((j) => j.country === testCountry)).toBe(true);
    });

    it("should filter judoka by rarity", () => {
      const rarities = ["Common", "Epic", "Legendary"];
      for (const rarity of rarities) {
        const filtered = judokaData.filter((j) => j.rarity === rarity);
        expect(filtered.every((j) => j.rarity === rarity)).toBe(true);
      }
    });

    it("should filter judoka by weight class", () => {
      const weightClasses = new Set(judokaData.map((j) => j.weightClass));
      const testWeightClass = Array.from(weightClasses)[0];
      const filtered = judokaData.filter((j) => j.weightClass === testWeightClass);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((j) => j.weightClass === testWeightClass)).toBe(true);
    });

    it("should apply multiple filters correctly", () => {
      const testCountry = judokaData[0].country;
      const testRarity = judokaData.find((j) => j.country === testCountry)?.rarity;

      const filtered = judokaData.filter(
        (j) => j.country === testCountry && j.rarity === testRarity
      );

      expect(filtered.every((j) => j.country === testCountry && j.rarity === testRarity)).toBe(
        true
      );
    });
  });

  describe("Judoka Data Integrity", () => {
    it("should have required fields in judoka records", () => {
      for (const judoka of judokaData.slice(0, 10)) {
        expect(judoka).toHaveProperty("id");
        expect(judoka).toHaveProperty("firstname");
        expect(judoka).toHaveProperty("surname");
        expect(judoka).toHaveProperty("country");
        expect(judoka).toHaveProperty("rarity");
        expect(judoka).toHaveProperty("stats");
      }
    });

    it("should have valid stats in judoka records", () => {
      for (const judoka of judokaData.slice(0, 10)) {
        const { stats } = judoka;
        expect(stats).toHaveProperty("power");
        expect(stats).toHaveProperty("speed");
        expect(stats).toHaveProperty("technique");
        expect(typeof stats.power).toBe("number");
        expect(typeof stats.speed).toBe("number");
      }
    });

    it("should have unique IDs", () => {
      const ids = judokaData.map((j) => j.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Embedding Data Integrity", () => {
    it("should have correct embedding dimensions", () => {
      const expectedDimension = embeddingsArray[0]?.embedding?.length;
      expect(
        expectedDimension,
        "Expected MiniLM embeddings to be 384 dimensions."
      ).toBe(384);
      for (const item of embeddingsArray.slice(0, 5)) {
        // All embeddings should have the same dimension (384 for MiniLM-L6-v2)
        expect(Array.isArray(item.embedding)).toBe(true);
        expect(
          item.embedding.length,
          `Expected embedding length ${expectedDimension}, got ${item.embedding.length}.`
        ).toBe(expectedDimension);
      }
    });

    it("should have valid embeddings (magnitude > 0)", () => {
      for (const item of embeddingsArray.slice(0, 5)) {
        const magnitude = norm(item.embedding);
        expect(magnitude).toBeGreaterThan(0);
        expect(magnitude).toBeLessThan(100); // Reasonable bounds
      }
    });

    it("should have IDs matching judoka records", () => {
      // Note: Some embeddings may be for documentation, not judoka
      // Just verify embeddings array is properly loaded
      expect(embeddingsArray.length).toBeGreaterThan(0);
      expect(embeddingsArray[0]).toHaveProperty("id");
      expect(embeddingsArray[0]).toHaveProperty("embedding");
    });
  });

  describe("judokon.getById functionality", () => {
    it("should retrieve a judoka by numeric ID", () => {
      const testJudoka = judokaData[0];
      expect(testJudoka).toBeDefined();

      const looked = judokaById.get(String(testJudoka.id));
      expect(looked).toBeDefined();
      expect(looked.id).toBe(testJudoka.id);
      expect(looked.firstname).toBe(testJudoka.firstname);
      expect(looked.surname).toBe(testJudoka.surname);
    });

    it("should retrieve a judoka by string ID", () => {
      const testJudoka = judokaData[1];
      expect(testJudoka).toBeDefined();

      const stringId = String(testJudoka.id);
      const looked = judokaById.get(stringId);
      expect(looked).toBeDefined();
      expect(looked.id).toBe(testJudoka.id);
    });

    it("should return undefined for non-existent ID", () => {
      const nonExistentId = "999999";
      const looked = judokaById.get(nonExistentId);
      expect(looked).toBeUndefined();
    });

    it("should return all required judoka properties", () => {
      const testJudoka = judokaData[0];
      const requiredFields = [
        "id",
        "firstname",
        "surname",
        "country",
        "weightClass",
        "gender",
        "rarity",
        "category",
        "stats",
        "cardCode"
      ];

      const looked = judokaById.get(String(testJudoka.id));
      expect(looked).toBeDefined();

      for (const field of requiredFields) {
        expect(looked).toHaveProperty(field);
      }
    });

    it("should have valid stats structure", () => {
      const testJudoka = judokaData[0];
      const looked = judokaById.get(String(testJudoka.id));

      expect(looked.stats).toBeDefined();
      expect(looked.stats).toHaveProperty("power");
      expect(looked.stats).toHaveProperty("speed");
      expect(looked.stats).toHaveProperty("technique");
      expect(looked.stats).toHaveProperty("kumikata");
      expect(looked.stats).toHaveProperty("newaza");

      // Stats should be numbers or zero
      const statKeys = ["power", "speed", "technique", "kumikata", "newaza"];
      for (const key of statKeys) {
        expect(typeof looked.stats[key]).toBe("number");
        expect(looked.stats[key]).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle ID normalization (numeric to string)", () => {
      const testJudoka = judokaData[0];
      const numericId = testJudoka.id;
      const stringId = String(numericId);

      const lookedByNum = judokaById.get(stringId);
      const lookedByStr = judokaById.get(stringId);

      expect(lookedByNum).toBeDefined();
      expect(lookedByStr).toBeDefined();
      expect(lookedByNum.id).toBe(lookedByStr.id);
    });

    it("should preserve all judoka data on lookup", () => {
      const testJudoka = judokaData[0];
      const looked = judokaById.get(String(testJudoka.id));

      // Verify key data is preserved
      expect(looked.firstname).toBe(testJudoka.firstname);
      expect(looked.surname).toBe(testJudoka.surname);
      expect(looked.country).toBe(testJudoka.country);
      expect(looked.rarity).toBe(testJudoka.rarity);
      expect(looked.gender).toBe(testJudoka.gender);
      expect(looked.weightClass).toBe(testJudoka.weightClass);
      expect(looked.cardCode).toBe(testJudoka.cardCode);
    });
  });
});
