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
          expandQueryWithSynonyms: vi.fn(async (q) => `${q} kumi kata`),
          // Return our dataset directly so queryRag hits expected entries
          findMatches: vi.fn(async (_vec, _k, _filters, _q) => dataset)
        }
      };
    });

    const { queryRag } = await import("../../src/helpers/queryRag.js");
    const results = await queryRag("grip fighting");
    delete process.env.RAG_FORCE_JSON;

    const vectorSearch = await import("../../src/helpers/vectorSearch/index.js");
    expect(vectorSearch.default.expandQueryWithSynonyms).toHaveBeenCalledWith("grip fighting");
    expect(extractor).toHaveBeenCalledWith("grip fighting kumi kata", { pooling: "mean" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe("grip");
  });
});
