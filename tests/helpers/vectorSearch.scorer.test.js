// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

const sample = [
  { id: "a", text: "A", embedding: [1, 0], source: "doc1", tags: ["foo"] },
  { id: "b", text: "B", embedding: [0, 1], source: "doc2", tags: ["bar"] }
];

let fetchJsonMock;

beforeEach(async () => {
  vi.resetModules();
  fetchJsonMock = (await import("../../src/helpers/dataUtils.js")).fetchJson;
  fetchJsonMock.mockReset();
  fetchJsonMock.mockImplementation((url) => {
    if (url.endsWith("client_embeddings.manifest.json")) {
      return Promise.resolve({ shards: ["shard1.json"] });
    }
    if (url.endsWith("shard1.json")) {
      return Promise.resolve(sample);
    }
    return Promise.resolve([]);
  });
});

afterEach(() => {
  fetchJsonMock.mockReset();
});

describe("vectorSearch scoring", () => {
  it("computes cosine similarity", async () => {
    const { cosineSimilarity } = await import("../../src/helpers/vectorSearch/scorer.js");
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("finds top matches", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 0], 1);
    expect(res?.length).toBe(1);
    expect(res[0].id).toBe("a");
    expect(res[0].score).toBeCloseTo(1);
  });

  it("filters by tags", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 0], 1, ["foo"]);
    expect(res?.[0].id).toBe("a");
    const other = await findMatches([1, 0], 1, ["bar"]);
    expect(other?.[0].id).toBe("b");
  });

  it("returns empty array when tags exclude all entries", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 0], 5, ["baz"]);
    expect(res).toEqual([]);
  });

  it("boosts results containing exact query terms", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 1], 2, [], "B");
    expect(res?.[0].id).toBe("b");
  });

  it("returns empty array for dimension mismatch", async () => {
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 0, 0], 1);
    expect(res).toEqual([]);
  });
});
