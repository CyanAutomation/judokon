import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.resetModules();
});

describe("selectTopMatches", () => {
  it("returns only the top match when score gap is large", async () => {
    vi.doMock("../../../src/helpers/api/vectorSearchPage.js", () => ({
      SIMILARITY_THRESHOLD: 0.4
    }));
    const { selectTopMatches } = await import(
      "../../../src/helpers/vectorSearchPage/selectTopMatches.js"
    );
    const matches = [{ score: 0.9 }, { score: 0.4 }, { score: 0.39 }, { score: 0.1 }];
    const { strongMatches, toRender } = selectTopMatches(matches);
    expect(strongMatches).toHaveLength(2);
    expect(toRender).toEqual([matches[0]]);
  });

  it("returns top three weak matches when no strong ones", async () => {
    vi.doMock("../../../src/helpers/api/vectorSearchPage.js", () => ({
      SIMILARITY_THRESHOLD: 0.9
    }));
    const { selectTopMatches } = await import(
      "../../../src/helpers/vectorSearchPage/selectTopMatches.js"
    );
    const matches = [{ score: 0.5 }, { score: 0.4 }, { score: 0.3 }, { score: 0.2 }];
    const { strongMatches, toRender } = selectTopMatches(matches);
    expect(strongMatches).toHaveLength(0);
    expect(toRender).toEqual(matches.slice(0, 3));
  });
});
