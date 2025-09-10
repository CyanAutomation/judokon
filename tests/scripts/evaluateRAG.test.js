import { describe, it, expect, vi } from "vitest";

vi.mock("@xenova/transformers", () => ({
  // Provide both exports used by the script under test
  env: {},
  pipeline: vi.fn(async () => {
    // Simulate model loading without any network calls
    return async () => ({ data: new Float32Array([0, 0, 0]) });
  })
}));

vi.mock("../../src/helpers/api/vectorSearchPage.js", () => ({
  getExtractor: vi.fn(async () => {
    // Mock extractor that returns fake embedding data
    return async () => ({ data: new Float32Array([0.1, 0.2, 0.3]) });
  })
}));

const findMatches = vi.hoisted(() => vi.fn(async () => [{ source: "design/doc.md", score: 0.95 }]));
const expandQueryWithSynonyms = vi.hoisted(() => vi.fn(async (query) => query));
vi.mock("../../src/helpers/vectorSearch/index.js", () => ({
  default: {
    findMatches,
    expandQueryWithSynonyms
  }
}));

import { evaluate } from "../../scripts/evaluation/evaluateRAG.js";

describe("evaluateRAG", () => {
  it("runs without throwing", async () => {
    await evaluate();
    expect(findMatches).toHaveBeenCalled();
  });

  it("does not fetch when network is blocked", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("network blocked");
    });

    await evaluate();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
