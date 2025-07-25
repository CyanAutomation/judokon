// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

const sample = [
  { id: "a", text: "A", embedding: [1, 0], source: "doc1" },
  { id: "b", text: "B", embedding: [0, 1], source: "doc2" }
];

describe("vectorSearch", () => {
  it("loads embeddings once and caches", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sample });
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch.js");
    const first = await loadEmbeddings();
    const second = await loadEmbeddings();
    expect(first).toEqual(sample);
    expect(second).toBe(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when loading fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    vi.resetModules();
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch.js");
    const result = await loadEmbeddings();
    expect(result).toBeNull();
  });

  it("computes cosine similarity", async () => {
    const { cosineSimilarity } = await import("../../src/helpers/vectorSearch.js");
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("finds top matches", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sample });
    vi.resetModules();
    const { findMatches } = await import("../../src/helpers/vectorSearch.js");
    const res = await findMatches([1, 0], 1);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("a");
    expect(res[0].score).toBeCloseTo(1);
  });

  it("returns empty array for dimension mismatch", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sample });
    vi.resetModules();
    const { findMatches } = await import("../../src/helpers/vectorSearch.js");
    const res = await findMatches([1, 0, 0], 1);
    expect(res).toEqual([]);
  });

  it("returns null when embeddings fail to load", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    vi.resetModules();
    const { findMatches } = await import("../../src/helpers/vectorSearch.js");
    const res = await findMatches([1, 0], 1);
    expect(res).toBeNull();
  });
});
