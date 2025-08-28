// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withAllowedConsole } from "../utils/console.js";

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

describe("vectorSearch loader", () => {
  it("loads embeddings once and caches", async () => {
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
    const first = await loadEmbeddings();
    const second = await loadEmbeddings();
    expect(first).toEqual(sample);
    expect(second).toBe(first);
    expect(fetchJsonMock).toHaveBeenCalledTimes(2); // manifest + shard
  });

  it("ensures embeddings use three-decimal precision", async () => {
    const decimalSample = [
      { id: "c", text: "C", embedding: [0.123, 0.456, 0.789], source: "doc3" }
    ];
    fetchJsonMock.mockImplementation((url) => {
      if (url.endsWith("client_embeddings.manifest.json")) {
        return Promise.resolve({ shards: ["shard1.json"] });
      }
      if (url.endsWith("shard1.json")) {
        return Promise.resolve(decimalSample);
      }
      return Promise.resolve([]);
    });
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
    const embeddings = await loadEmbeddings();
    for (const entry of embeddings ?? []) {
      for (const value of entry.embedding) {
        const decimals = value.toString().split(".")[1];
        expect(decimals ? decimals.length : 0).toBeLessThanOrEqual(3);
      }
    }
  });

  it("returns null when loading fails", async () => {
    await withAllowedConsole(async () => {
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
    }, ["error"]);
  });
});
