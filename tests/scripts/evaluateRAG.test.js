import { describe, it, expect, vi, afterEach } from "vitest";

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
    expandQueryWithSynonyms,
    loadEmbeddings: vi.fn(),
    fetchContextById: vi.fn()
  }
}));

const TEST_QUERIES = [
  { query: "first question", expected_source: "docs/a" },
  { query: "second question", expected_source: "docs/b" }
];

const MATCH_RESPONSES = {
  "first question": [
    { source: "docs/a/overview.md", score: 0.91 },
    { source: "docs/z/extra.md", score: 0.7 }
  ],
  "second question": [
    { source: "docs/x/guide.md", score: 0.83 },
    { source: "docs/y/reference.md", score: 0.81 },
    { source: "docs/b/index.md", score: 0.8 }
  ]
};

function createHrtimeStub(step = 5) {
  let current = 0;
  return () => {
    current += step;
    return current;
  };
}

function createQueryStub(responses) {
  return vi.fn(async (query) => {
    const result = responses[query];
    return Array.isArray(result) ? result : [];
  });
}

import { evaluate } from "../../scripts/evaluation/evaluateRAG.js";

describe("evaluateRAG", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("returns aggregate metrics and per-query ranks", async () => {
    const queryFn = createQueryStub(MATCH_RESPONSES);
    const summary = await evaluate(null, {
      queries: TEST_QUERIES,
      queryFn,
      hrtime: createHrtimeStub()
    });

    expect(summary.metrics.mrr5).toBeCloseTo((1 + 1 / 3) / 2, 5);
    expect(summary.metrics.recall3).toBeCloseTo(1, 5);
    expect(summary.metrics.recall5).toBeCloseTo(1, 5);
    expect(summary.queries.map((q) => q.rank)).toEqual([1, 3]);
    expect(summary.queries[0].matches[0]).toEqual({ source: "docs/a/overview.md", score: 0.91 });
  });

  it("prints CLI output with per-query breakdown", async () => {
    const log = vi.fn();
    const queryFn = createQueryStub(MATCH_RESPONSES);
    await evaluate(null, {
      queries: TEST_QUERIES,
      queryFn,
      hrtime: createHrtimeStub(),
      logger: { log, error: vi.fn() }
    });

    const outputs = log.mock.calls.map(([msg]) => msg);
    expect(outputs.find((msg) => msg.includes('--- Query: "first question" ---'))).toBeTruthy();
    expect(outputs.find((msg) => msg.includes("Rank Found: 1"))).toBeTruthy();
    expect(outputs.find((msg) => msg.includes("MRR@5: 0.6667"))).toBeTruthy();
    expect(outputs.find((msg) => msg.includes("Recall@3: 1.0000"))).toBeTruthy();
  });

  it("marks evaluation failure and sets exit code when thresholds fail", async () => {
    const error = vi.fn();
    const summary = await evaluate(null, {
      queries: TEST_QUERIES,
      queryFn: createQueryStub({}),
      hrtime: createHrtimeStub(),
      logger: { log: vi.fn(), error }
    });

    expect(summary.pass).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith("RAG evaluation failed thresholds.");
  });

  it("does not fetch when network is blocked", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("network blocked");
    });

    await evaluate(null, {
      queries: TEST_QUERIES,
      queryFn: createQueryStub(MATCH_RESPONSES),
      hrtime: createHrtimeStub()
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
