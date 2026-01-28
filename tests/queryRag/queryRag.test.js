// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { setupMockDataset } from "../helpers/vectorSearch/mockDataset.js";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

describe("queryRag", () => {
  it("expands synonyms and returns expected matches", async () => {
    // Ensure loader uses JSON manifest path for this test
    process.env.RAG_FORCE_JSON = "1";
    const dataset = [
      {
        id: "grip",
        text: "kumi kata basics grip fighting",
        embedding: [1, 0],
        source: "doc1",
        tags: []
      },
      {
        id: "other",
        text: "other topic",
        embedding: [0, 1],
        source: "doc2",
        tags: []
      }
    ];
    await setupMockDataset(dataset);

    const extractor = vi.fn(async () => [1, 0]);
    const getExtractorMock = vi.fn(async () => extractor);
    vi.doMock("../../src/helpers/api/vectorSearchPage.js", () => ({
      getExtractor: getExtractorMock
    }));

    vi.doMock("../../src/helpers/vectorSearch/index.js", async () => {
      const actual = await vi.importActual("../../src/helpers/vectorSearch/index.js");
      return {
        default: {
          ...actual.default,
          expandQuery: vi.fn(async (q) => `${q} kumi kata`),
          // Return our dataset directly so queryRag hits expected entries
          findMatches: vi.fn(async () => dataset)
        }
      };
    });

    const { queryRag } = await import("../../src/helpers/queryRag.js");
    const results = await queryRag("grip fighting");
    delete process.env.RAG_FORCE_JSON;

    const vectorSearch = await import("../../src/helpers/vectorSearch/index.js");
    expect(vectorSearch.default.expandQuery).toHaveBeenCalledWith("grip fighting");
    expect(extractor).toHaveBeenCalledWith("grip fighting kumi kata", { pooling: "mean" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe("grip");
  });

  it("handles Float32Array embeddings for multi-intent sub-queries", async () => {
    process.env.RAG_FORCE_JSON = "1";
    const dataset = [
      {
        id: "sweeps",
        text: "foot sweep tactics",
        embedding: [1, 0],
        source: "doc3",
        tags: []
      }
    ];
    await setupMockDataset(dataset);

    const extractor = vi.fn(async () => new Float32Array([1, 0]));
    const getExtractorMock = vi.fn(async () => extractor);
    vi.doMock("../../src/helpers/api/vectorSearchPage.js", () => ({
      getExtractor: getExtractorMock
    }));

    const question = "Grip fighting and foot sweep tactics";
    const findMatches = vi.fn(async (vec, _k, _filters, queryText) => {
      if (queryText === question) {
        return [];
      }
      expect(Array.isArray(vec)).toBe(true);
      return dataset;
    });

    vi.doMock("../../src/helpers/vectorSearch/index.js", async () => ({
      default: {
        expandQuery: vi.fn(async (q) => q),
        findMatches
      }
    }));

    const { queryRag } = await import("../../src/helpers/queryRag.js");
    const results = await queryRag(question);
    delete process.env.RAG_FORCE_JSON;

    expect(extractor).toHaveBeenCalledTimes(3);
    expect(findMatches).toHaveBeenCalledWith(
      expect.any(Array),
      5,
      expect.any(Array),
      "grip fighting"
    );
    expect(findMatches).toHaveBeenCalledWith(
      expect.any(Array),
      5,
      expect.any(Array),
      "foot sweep tactics"
    );
    expect(results).not.toHaveLength(0);
    expect(results[0].id).toBe("sweeps");
  });
});
