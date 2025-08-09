import { describe, it, expect, vi } from "vitest";

vi.doMock("../../src/helpers/vectorSearch.js", () => ({
  loadEmbeddings: vi.fn().mockResolvedValue([1]),
  findMatches: vi.fn().mockResolvedValue([2]),
  fetchContextById: vi.fn().mockResolvedValue(["ctx"]),
  CURRENT_EMBEDDING_VERSION: 1
}));
vi.doMock("../../src/helpers/vectorSearchQuery.js", () => ({
  expandQueryWithSynonyms: vi.fn().mockResolvedValue("expanded")
}));

describe("vectorSearch index", () => {
  it("exposes bundled helpers", async () => {
    const vectorSearch = (await import("../../src/helpers/vectorSearch/index.js")).default;
    expect(await vectorSearch.loadEmbeddings()).toEqual([1]);
    expect(await vectorSearch.findMatches()).toEqual([2]);
    expect(await vectorSearch.expandQueryWithSynonyms("q")).toBe("expanded");
    expect(await vectorSearch.fetchContextById("id")).toEqual(["ctx"]);
    expect(vectorSearch.CURRENT_EMBEDDING_VERSION).toBe(1);
  });
});
