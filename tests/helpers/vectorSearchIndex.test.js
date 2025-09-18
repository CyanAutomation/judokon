import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

const fixtureEmbeddings = [
  { id: "alpha", text: "Alpha quickstart", embedding: [0.9, 0.1], source: "doc-alpha" },
  {
    id: "beta",
    text: "Beta guide",
    embedding: [0.6, 0.4],
    source: "doc-beta",
    tags: ["guide"]
  },
  { id: "gamma", text: "Gamma reference", embedding: [0.1, 0.9], source: "doc-gamma" }
];

const synonymsFixture = {
  beta: ["release-notes", "beta-guide"]
};

let fetchJsonMock;

function normalizeUrl(url) {
  if (typeof url === "string") return url;
  if (url && typeof url.href === "string") return url.href;
  return String(url);
}

beforeEach(async () => {
  vi.resetModules();
  const { fetchJson } = await import("../../src/helpers/dataUtils.js");
  fetchJsonMock = fetchJson;
  fetchJsonMock.mockReset();
  fetchJsonMock.mockImplementation((url) => {
    const target = normalizeUrl(url);
    if (target.endsWith("client_embeddings.json")) {
      return Promise.resolve(fixtureEmbeddings);
    }
    if (target.endsWith("client_embeddings.manifest.json")) {
      return Promise.resolve({ shards: ["shard1.json"] });
    }
    if (target.endsWith("shard1.json")) {
      return Promise.resolve(fixtureEmbeddings);
    }
    if (target.endsWith("synonyms.json")) {
      return Promise.resolve(synonymsFixture);
    }
    return Promise.resolve([]);
  });
});

afterEach(() => {
  fetchJsonMock?.mockReset();
});

describe("vectorSearch index", () => {
  it("loads embeddings and ranks matches via the composed helpers", async () => {
    const vectorSearch = (await import("../../src/helpers/vectorSearch/index.js")).default;

    const matches = await vectorSearch.findMatches([0.6, 0.4], 3, [], "Beta guide");
    expect(matches).toHaveLength(3);
    expect(matches.map((entry) => entry.id)).toEqual(["beta", "alpha", "gamma"]);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
    expect(matches[1].score).toBeGreaterThan(matches[2].score);
    expect(matches[0]).toMatchObject({ source: "doc-beta", tags: ["guide"] });

    const embeddings = await vectorSearch.loadEmbeddings();
    expect(embeddings).toEqual(fixtureEmbeddings);

    const expanded = await vectorSearch.expandQueryWithSynonyms("bata");
    expect(expanded.split(" ")).toEqual(["bata", "release-notes", "beta-guide"]);
  });

  it("exposes the vector search API surface", async () => {
    const vectorSearch = (await import("../../src/helpers/vectorSearch/index.js")).default;
    expect(vectorSearch).toMatchObject({
      loadEmbeddings: expect.any(Function),
      findMatches: expect.any(Function),
      expandQueryWithSynonyms: expect.any(Function),
      fetchContextById: expect.any(Function),
      CURRENT_EMBEDDING_VERSION: expect.any(Number)
    });
  });
});
