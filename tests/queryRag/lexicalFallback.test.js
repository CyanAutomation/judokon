// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { setupMockDataset } from "../helpers/vectorSearch/mockDataset.js";
import { withMutedConsole } from "../utils/console.js";

describe("queryRag lexical fallback", () => {
  it("returns results via lexical scoring when extractor fails and fallback enabled", async () => {
    // Ensure loader uses mocked JSON path
    vi.mock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn(),
      validateWithSchema: vi.fn().mockResolvedValue(undefined)
    }));
    process.env.RAG_FORCE_JSON = "1"; // loader uses JSON path
    process.env.RAG_ALLOW_LEXICAL_FALLBACK = "1";

    const dataset = [
      {
        id: "tips",
        text: "Tooltips are defined in tooltips.json with id and content",
        sparseVector: { tooltips: 2, defined: 1, json: 1, id: 1, content: 1 },
        embedding: [0, 0],
        source: "src/data/tooltips.json [chunk 1]",
        tags: ["data", "tooltip"]
      },
      {
        id: "nav",
        text: "Navigation bar styles in main.css",
        sparseVector: { navigation: 1, bar: 1, styles: 1, css: 1 },
        embedding: [0, 0],
        source: "src/styles/main.css [selector-1]",
        tags: ["code", "css"]
      }
    ];
    await setupMockDataset(dataset);

    // Force getExtractor to fail so fallback path triggers
    vi.doMock("../../src/helpers/api/vectorSearchPage.js", () => ({
      getExtractor: vi.fn(async () => {
        throw new Error("model failed to load");
      })
    }));

    // Ensure vectorSearch.loadEmbeddings returns our dataset instead of reading real files
    vi.doMock("../../src/helpers/vectorSearch/index.js", async () => {
      const actual = await vi.importActual("../../src/helpers/vectorSearch/index.js");
      return {
        default: {
          ...actual.default,
          loadEmbeddings: vi.fn(async () => dataset)
        }
      };
    });

    const { queryRag } = await import("../../src/helpers/queryRag.js");
    const results = await withMutedConsole(() =>
      queryRag("how to add tooltips", { withProvenance: true })
    );

    delete process.env.RAG_FORCE_JSON;
    delete process.env.RAG_ALLOW_LEXICAL_FALLBACK;

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("tips");
    // Ensure provenance fields appear when requested
    expect(results[0].contextPath).toBeTruthy();
    expect(typeof results[0].rationale).toBe("string");
  });
});
