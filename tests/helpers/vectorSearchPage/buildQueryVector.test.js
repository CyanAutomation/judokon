import { describe, it, expect, vi, afterEach } from "vitest";
import { mockVectorSearch, mockExtractor } from "./fixtures.js";

afterEach(() => {
  vi.resetModules();
});

describe("buildQueryVector", () => {
  it("expands the query and returns a vector", async () => {
    const expandQueryWithSynonyms = vi.fn().mockResolvedValue("expanded");
    mockVectorSearch({ expandQueryWithSynonyms });
    await mockExtractor(async () => ({ data: [1, 2, 3] }));
    const { buildQueryVector } = await import(
      "../../../src/helpers/vectorSearchPage/buildQueryVector.js"
    );
    const result = await buildQueryVector("Hello World");
    expect(expandQueryWithSynonyms).toHaveBeenCalledWith("Hello World");
    expect(result.terms).toEqual(["hello", "world"]);
    expect(result.vector).toEqual([1, 2, 3]);
  });

  it("throws when extractor returns non-iterable data", async () => {
    mockVectorSearch();
    await mockExtractor(async () => ({ data: 123 }));
    const { buildQueryVector } = await import(
      "../../../src/helpers/vectorSearchPage/buildQueryVector.js"
    );
    await expect(buildQueryVector("test")).rejects.toThrow("Extractor result.data is not iterable");
  });
});
