// @vitest-environment node
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

const originalFetch = global.fetch;
let fetchJsonMock;

beforeEach(async () => {
  vi.resetModules();
  fetchJsonMock = (await import("../../src/helpers/dataUtils.js")).fetchJson;
  fetchJsonMock.mockReset();
  // Mock the manifest and the shard
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
  global.fetch = originalFetch;
});

const sample = [
  { id: "a", text: "A", embedding: [1, 0], source: "doc1", tags: ["foo"] },
  { id: "b", text: "B", embedding: [0, 1], source: "doc2", tags: ["bar"] }
];

describe("vectorSearch", () => {
  it("loads embeddings once and caches", async () => {
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
    const first = await loadEmbeddings();
    const second = await loadEmbeddings();
    expect(first).toEqual(sample);
    expect(second).toBe(first);
    expect(fetchJsonMock).toHaveBeenCalledTimes(2); // manifest + 1 shard
  });

  it("returns null when loading fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchJsonMock.mockImplementation((url) => {
      if (url.endsWith("client_embeddings.manifest.json")) {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve(sample);
    });
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
    const result = await loadEmbeddings();
    expect(result).toBeNull();
    errorSpy.mockRestore();
  });

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

  it("returns empty array when embeddings dataset is empty", async () => {
    fetchJsonMock.mockImplementation((url) => {
      if (url.endsWith("client_embeddings.manifest.json")) {
        return Promise.resolve({ shards: ["shard1.json"] });
      }
      if (url.endsWith("shard1.json")) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 0], 1);
    expect(res).toEqual([]);
  });

  it("skips entries with invalid embeddings", async () => {
    const malformed = [
      { id: "a", text: "A", embedding: [1, 0], source: "doc1", sparseVector: { a: 1 } },
      { id: "bad1", text: "X", embedding: [1], source: "doc3", sparseVector: { x: 1 } },
      { id: "bad2", text: "Y", embedding: ["no"], source: "doc4", sparseVector: { y: 1 } },
      { id: "bad3", text: "Z", source: "doc5", sparseVector: { z: 1 } },
      { id: "b", text: "B", embedding: [0, 1], source: "doc2", sparseVector: { b: 1 } }
    ];
    fetchJsonMock.mockImplementation((url) => {
      if (url.endsWith("client_embeddings.manifest.json")) {
        return Promise.resolve({ shards: ["shard1.json"] });
      }
      if (url.endsWith("shard1.json")) {
        return Promise.resolve(malformed);
      }
      return Promise.resolve([]);
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 0], 5);
    expect(res?.map((r) => r.id)).toEqual(["a", "b"]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it("returns null when embeddings fail to load", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchJsonMock.mockImplementation((url) => {
      if (url.endsWith("client_embeddings.manifest.json")) {
        return Promise.resolve({ shards: ["shard1.json"] });
      }
      if (url.endsWith("shard1.json")) {
        return Promise.reject(new Error("fail"));
      }
      return Promise.resolve([]);
    });
    const { findMatches } = await import("../../src/helpers/vectorSearch/scorer.js");
    const res = await findMatches([1, 0], 1);
    expect(res).toBeNull();
    errorSpy.mockRestore();
  });

  it("fetches context around an id", async () => {
    const seg1 = "x".repeat(1600);
    const seg2 = "y".repeat(1600);
    const seg3 = "z".repeat(1600);
    const md = `${seg1}\n\n${seg2}\n\n${seg3}`;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => md });
    const { fetchContextById } = await import("../../src/helpers/vectorSearch/context.js");
    const result = await fetchContextById("doc.md-chunk-3", 1);
    expect(global.fetch).toHaveBeenCalled();
    expect(result).toHaveLength(3);
    expect(result[0].length).toBe(1500);
    expect(result[1].length).toBe(1500);
    expect(result[2].length).toBe(604);
  });

  it("chunks markdown by heading", async () => {
    const md = "## A\nText A\n### B\nText B\n## C\nText C";
    const { chunkMarkdown } = await import("../../src/helpers/vectorSearch/context.js");
    const chunks = chunkMarkdown(md);
    expect(chunks).toEqual(["## A\nText A\n### B\nText B", "### B\nText B", "## C\nText C"]);
  });

  it("returns empty array for invalid id", async () => {
    const { fetchContextById } = await import("../../src/helpers/vectorSearch/context.js");
    const res = await fetchContextById("badid");
    expect(res).toEqual([]);
  });
});
