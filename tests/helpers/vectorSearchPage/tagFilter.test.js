import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockVectorSearch,
  mockDataUtils,
  mockConstants,
  setupPage,
  defaultDom
} from "./fixtures.js";

afterEach(() => {
  vi.resetModules();
});

describe("tag filter", () => {
  it("passes selected tag to findMatches", async () => {
    const findMatches = vi.fn().mockResolvedValue([]);
    mockVectorSearch({
      findMatches,
      loadEmbeddings: vi.fn().mockResolvedValue([{ tags: ["foo"], version: 1 }])
    });
    mockDataUtils();
    mockConstants();
    const { handleSearch } = await setupPage(defaultDom);
    document.getElementById("vector-search-input").value = "test";
    document.getElementById("tag-filter").value = "foo";
    await handleSearch(new Event("submit"));
    expect(findMatches).toHaveBeenCalled();
    expect(findMatches.mock.calls[0][2]).toEqual(["foo"]);
  });

  it("displays embedding count and tag options on init", async () => {
    const embeddings = [
      { tags: ["alpha"], version: 1 },
      { tags: ["beta"], version: 1 }
    ];
    mockVectorSearch({ loadEmbeddings: vi.fn().mockResolvedValue(embeddings) });
    mockDataUtils(vi.fn().mockResolvedValue({ count: 2, version: 1 }));
    mockConstants();
    const html = `
      <select id="tag-filter"></select>
      <form id="vector-search-form"></form>
      <p id="embedding-stats"></p>
    `;
    await setupPage(html);
    const statsEl = document.getElementById("embedding-stats");
    expect(statsEl.textContent).toContain("2");
    const options = Array.from(document.querySelectorAll("#tag-filter option")).map((o) => o.value);
    expect(options).toEqual(["all", "alpha", "beta"]);
  });
});
