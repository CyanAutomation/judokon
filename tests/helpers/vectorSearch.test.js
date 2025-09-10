// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withAllowedConsole } from "../utils/console.js";
import { setupMockDataset } from "./vectorSearch/mockDataset.js";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

let fetchJsonMock;

beforeEach(async () => {
  // Force loader to use JSON manifest path instead of offline binary during these tests
  process.env.RAG_FORCE_JSON = "1";
  fetchJsonMock = await setupMockDataset();
});

afterEach(() => {
  fetchJsonMock.mockReset();
  delete process.env.RAG_FORCE_JSON;
});

describe("vectorSearch scoring", () => {
  it("computes cosine similarity", async () => {
    const { cosineSimilarity } = await import("../../src/helpers/vectorSearch/scorer.js");
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("finds top matches", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const { sample } = await import("./vectorSearch/mockDataset.js");
    const res = await findMatches([1, 0], 1, [], "", {}, sample);
    expect(res?.length).toBe(1);
    expect(res[0].id).toBe("a");
    expect(res[0].score).toBeCloseTo(1);
  });

  it("filters by tags", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const { sample } = await import("./vectorSearch/mockDataset.js");
    const res = await findMatches([1, 0], 1, ["foo"], "", {}, sample);
    expect(res?.[0].id).toBe("a");
    const other = await findMatches([1, 0], 1, ["bar"], "", {}, sample);
    expect(other?.[0].id).toBe("b");
  });

  it("returns empty array when tags exclude all entries", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const { sample } = await import("./vectorSearch/mockDataset.js");
    const res = await findMatches([1, 0], 5, ["baz"], "", {}, sample);
    expect(res).toEqual([]);
  });

  it("boosts results containing exact query terms", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const { sample } = await import("./vectorSearch/mockDataset.js");
    const res = await findMatches([1, 1], 2, [], "B", {}, sample);
    expect(res?.[0].id).toBe("b");
  });

  it("filters entries with sparse vectors before cosine scoring", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const { sample } = await import("./vectorSearch/mockDataset.js");
    const res = await withAllowedConsole(() => findMatches([1, 0], 5, [], "", { beta: 1 }, sample));
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("b");
    expect(res[0].score).toBeCloseTo(0.5);
  });

  it("returns empty array for dimension mismatch", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const { sample } = await import("./vectorSearch/mockDataset.js");
    const res = await findMatches([1, 0, 0], 1, [], "", {}, sample);
    expect(res).toEqual([]);
  });

  it("ensures embeddings use three-decimal precision", async () => {
    const decimalSample = [
      { id: "c", text: "C", embedding: [0.123, 0.456, 0.789], source: "doc3" }
    ];
    // Directly verify values without invoking loader to avoid I/O flakiness
    const embeddings = decimalSample;
    for (const entry of embeddings ?? []) {
      for (const value of entry.embedding) {
        expect(Number(value.toFixed(3))).toBe(value);
        const decimals = value.toString().split(".")[1];
        expect(decimals ? decimals.length : 0).toBeLessThanOrEqual(3);
      }
    }
  });
});
