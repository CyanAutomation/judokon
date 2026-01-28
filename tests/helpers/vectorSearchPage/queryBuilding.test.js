import { describe, it, expect, vi, afterEach } from "vitest";
import { mockDataUtils, mockConstants, setupPage } from "./fixtures.js";

afterEach(() => {
  vi.resetModules();
});

describe("query building", () => {
  it("wraps query words in <mark>", async () => {
    const { highlightTerms } = await import("../../../src/helpers/snippetFormatter.js");
    const result = highlightTerms("The Quick Brown Fox", ["quick", "fox"]);
    expect(result).toBe("The <mark>Quick</mark> Brown <mark>Fox</mark>");
  });

  it("returns escaped text when no terms provided", async () => {
    const { highlightTerms } = await import("../../../src/helpers/snippetFormatter.js");
    expect(highlightTerms("<script>", [])).toBe("&lt;script&gt;");
  });

  it("expands query terms using the synonym list", async () => {
    const synonyms = { "shoulder throw": ["seoi-nage"] };
    mockConstants();
    mockDataUtils(vi.fn().mockResolvedValue(synonyms));
    const vectorSearch = (await import("../../../src/helpers/vectorSearch/index.js")).default;
    const result = await vectorSearch.expandQuery("shoulder throw");
    expect(result).toContain("seoi-nage");
  });

  it("handles misspellings via Levenshtein check", async () => {
    const synonyms = { "seoi nage": ["seoi-nage"] };
    const findMatches = vi.fn().mockResolvedValue([]);
    vi.doMock("../../../src/helpers/vectorSearch/index.js", async () => {
      const { expandQuery: expandQueryBase } = await import(
        "../../../src/helpers/queryExpander.js"
      );
      const expandQuery = async (query) => {
        const result = await expandQueryBase(query);
        const lower = typeof query === "string" ? query.toLowerCase() : "";
        const words = lower.split(/\s+/).filter(Boolean);
        const additions = Array.isArray(result.addedTerms) ? result.addedTerms : [];
        return [...new Set([...words, ...additions.map((term) => term.toLowerCase())])].join(" ");
      };
      return {
        default: {
          findMatches,
          fetchContextById: vi.fn(),
          loadEmbeddings: vi.fn().mockResolvedValue([]),
          expandQuery,
          CURRENT_EMBEDDING_VERSION: 1
        }
      };
    });
    const fetchJson = vi.fn(async (path) => {
      if (path.endsWith("synonyms.json")) return synonyms;
      if (path.endsWith("client_embeddings.meta.json")) return { count: 0, version: 1 };
      return null;
    });
    mockDataUtils(fetchJson);
    mockConstants();
    let captured = "";
    const { handleSearch } = await setupPage(undefined, async (text) => {
      captured = text;
      return { data: [0, 0, 0] };
    });
    document.getElementById("vector-search-input").value = "seoi nagee";
    await handleSearch(new Event("submit"));
    expect(captured).toContain("seoi-nage");
    expect(findMatches).toHaveBeenCalled();
  });
});
