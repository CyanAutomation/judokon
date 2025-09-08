// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sample, setupMockDataset } from "./mockDataset.js";

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

const fetchJsonMock = () => import("../../../src/helpers/dataUtils.js").then((m) => m.fetchJson);

beforeEach(() => {
  vi.resetModules();
  delete global.window;
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.RAG_FORCE_JSON;
  delete global.window;
  vi.unmock("../../../src/helpers/constants.js");
});

describe("loader environment paths", () => {
  it("loads offline embeddings when available", async () => {
    const meta = { vectorLength: 2, items: [{ id: "a", text: "A", source: "doc1" }] };
    const vectors = Buffer.from([1, 0]);
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "emb-"));
    writeFileSync(join(dir, "offline_rag_metadata.json"), JSON.stringify(meta));
    writeFileSync(join(dir, "offline_rag_vectors.bin"), vectors);
    vi.doMock("../../../src/helpers/constants.js", () => ({
      DATA_DIR: new URL(`file://${dir}/`).href
    }));
    const { loadOfflineEmbeddings } = await import("../../../src/helpers/vectorSearch/loader.js");
    const result = await loadOfflineEmbeddings();
    expect(result).toEqual([{ id: "a", text: "A", source: "doc1", embedding: [1, 0] }]);
  });

  it("uses single-file override in browser", async () => {
    process.env.RAG_FORCE_JSON = "1";
    global.window = {};
    const fetch = await fetchJsonMock();
    fetch.mockResolvedValue(sample);
    const { loadEmbeddings } = await import("../../../src/helpers/vectorSearch/loader.js");
    const result = await loadEmbeddings();
    expect(result).toEqual(sample);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("client_embeddings.json"));
  });

  it("falls back to manifest shards", async () => {
    process.env.RAG_FORCE_JSON = "1";
    const fetch = await setupMockDataset(sample);
    const { loadEmbeddings } = await import("../../../src/helpers/vectorSearch/loader.js");
    const result = await loadEmbeddings();
    expect(result).toEqual(sample);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
