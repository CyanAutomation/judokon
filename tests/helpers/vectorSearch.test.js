// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

const sample = [
  { id: "a", text: "A", embedding: [1, 0], source: "doc1", tags: ["foo"] },
  { id: "b", text: "B", embedding: [0, 1], source: "doc2", tags: ["bar"] }
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

  it("filters by tags", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sample });
    vi.resetModules();
    const { findMatches } = await import("../../src/helpers/vectorSearch.js");
    const res = await findMatches([1, 0], 1, ["foo"]);
    expect(res[0].id).toBe("a");
    const other = await findMatches([1, 0], 1, ["bar"]);
    expect(other[0].id).toBe("b");
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

  it("fetches context around an id", async () => {
    const seg1 = "x".repeat(1600);
    const seg2 = "y".repeat(1600);
    const seg3 = "z".repeat(1600);
    const md = `${seg1}\n\n${seg2}\n\n${seg3}`;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => md });
    vi.resetModules();
    const { fetchContextById } = await import("../../src/helpers/vectorSearch.js");
    const result = await fetchContextById("doc.md-chunk-3", 1);
    expect(global.fetch).toHaveBeenCalled();
    expect(result).toHaveLength(3);
    expect(result[0].length).toBe(1500);
    expect(result[1].length).toBe(1500);
    expect(result[2].length).toBe(604);
  });

  it("chunks markdown by heading", async () => {
    const md = "## A\nText A\n### B\nText B\n## C\nText C";
    const { chunkMarkdown } = await import("../../src/helpers/vectorSearch.js");
    const chunks = chunkMarkdown(md);
    expect(chunks).toEqual(["## A\nText A\n### B\nText B", "### B\nText B", "## C\nText C"]);
  });

  it("returns empty array for invalid id", async () => {
    const { fetchContextById } = await import("../../src/helpers/vectorSearch.js");
    const res = await fetchContextById("badid");
    expect(res).toEqual([]);
  });
});
