import { describe, it, expect, vi } from "vitest";

/**
 * Unit tests for selectMatches helper in vectorSearchPage.
 */

describe("selectMatches", () => {
  it("returns only the top match when drop off exceeds threshold", async () => {
    const { selectMatches } = await import("../../src/helpers/vectorSearchPage.js");
    const strong = [
      { id: "1", score: 0.95 },
      { id: "2", score: 0.4 },
      { id: "3", score: 0.39 }
    ];
    const result = selectMatches(strong, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all strong matches when drop off is small", async () => {
    const { selectMatches } = await import("../../src/helpers/vectorSearchPage.js");
    const strong = [
      { id: "1", score: 0.8 },
      { id: "2", score: 0.7 }
    ];
    const result = selectMatches(strong, []);
    expect(result).toEqual(strong);
  });

  it("uses weak matches when no strong matches exist", async () => {
    const { selectMatches } = await import("../../src/helpers/vectorSearchPage.js");
    const weak = [
      { id: "a", score: 0.5 },
      { id: "b", score: 0.4 },
      { id: "c", score: 0.3 },
      { id: "d", score: 0.2 }
    ];
    const result = selectMatches([], weak);
    expect(result).toEqual(weak.slice(0, 3));
  });
});

describe("vector search page integration", () => {
  it("passes selected tag to findMatches", async () => {
    const findMatches = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/vectorSearch.js", () => ({
      findMatches,
      fetchContextById: vi.fn(),
      loadEmbeddings: vi.fn().mockResolvedValue([{ tags: ["foo"] }])
    }));

    const { handleSearch, init, __setExtractor } = await import(
      "../../src/helpers/vectorSearchPage.js"
    );

    __setExtractor(async () => ({ data: [0, 0, 0] }));

    document.body.innerHTML = `
      <div id="search-spinner"></div>
      <form id="vector-search-form">
        <input id="vector-search-input" />
        <select id="tag-filter"><option value="foo">foo</option></select>
      </form>
      <table id="vector-results-table"><tbody></tbody></table>
      <p id="search-results-message"></p>
    `;

    document.getElementById("vector-search-input").value = "test";

    await init();

    document.getElementById("tag-filter").value = "foo";
    await handleSearch(new Event("submit"));

    expect(findMatches).toHaveBeenCalled();
    expect(findMatches.mock.calls[0][2]).toEqual(["foo"]);
  });

  it("displays embedding count and tag options on init", async () => {
    const embeddings = [{ tags: ["alpha"] }, { tags: ["beta"] }];
    vi.doMock("../../src/helpers/vectorSearch.js", () => ({
      findMatches: vi.fn(),
      fetchContextById: vi.fn(),
      loadEmbeddings: vi.fn().mockResolvedValue(embeddings)
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ count: 2 })
    }));
    vi.doMock("../../src/helpers/constants.js", () => ({
      DATA_DIR: "./"
    }));

    const { init } = await import("../../src/helpers/vectorSearchPage.js");

    document.body.innerHTML = `
      <select id="tag-filter"></select>
      <div id="search-spinner"></div>
      <form id="vector-search-form"></form>
      <p id="embedding-stats"></p>
    `;

    await init();

    const statsEl = document.getElementById("embedding-stats");
    expect(statsEl.textContent).toContain("2");
    const options = Array.from(
      document.getElementById("tag-filter").querySelectorAll("option")
    ).map((o) => o.value);
    expect(options).toEqual(["all", "alpha", "beta"]);
  });
});
