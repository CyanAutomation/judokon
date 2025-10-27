// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withMutedConsole } from "../../utils/console.js";
import { sample, setupMockDataset } from "./mockDataset.js";

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn()
}));

describe("vectorSearch loader helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete global.window;
    delete process.env.RAG_FORCE_JSON;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("loads offline embeddings", async () => {
    vi.doMock("node:url", () => ({ fileURLToPath: (u) => u }));
    vi.doMock("node:fs/promises", () => ({ readFile: vi.fn() }));
    const meta = {
      vectorLength: 2,
      items: sample.map(({ id, text, source, tags }) => ({ id, text, source, tags }))
    };
    // Quantize sample embeddings to Int8 with rounding and clamping
    const vec = Buffer.from(
      Int8Array.from(
        sample.flatMap((s) => s.embedding.map((v) => Math.max(-128, Math.min(127, Math.round(v)))))
      ).buffer
    );
    const { readFile } = await import("node:fs/promises");
    readFile.mockImplementation((path) => {
      if (String(path).includes("offline_rag_metadata.json")) {
        return Promise.resolve(JSON.stringify(meta));
      }
      return Promise.resolve(vec);
    });
    const { loadOfflineEmbeddings } = await import("../../../src/helpers/vectorSearch/loader.js");
    const result = await loadOfflineEmbeddings();
    expect(result).toEqual(sample);
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it("loads single-file embeddings in browser", async () => {
    const { fetchJson } = await import("../../../src/helpers/dataUtils.js");
    fetchJson.mockResolvedValue(sample);
    global.window = {};
    const { loadSingleFileEmbeddings } = await import(
      "../../../src/helpers/vectorSearch/loader.js"
    );
    const result = await loadSingleFileEmbeddings();
    expect(result).toEqual(sample);
  });

  it("returns null when single-file fetch fails", async () => {
    const { fetchJson } = await import("../../../src/helpers/dataUtils.js");
    fetchJson.mockRejectedValue(new Error("fail"));
    global.window = {};
    const { loadSingleFileEmbeddings } = await import(
      "../../../src/helpers/vectorSearch/loader.js"
    );
    const result = await loadSingleFileEmbeddings();
    expect(result).toBeNull();
  });

  it("loads embeddings via manifest and shards", async () => {
    const fetchJsonMock = await setupMockDataset();
    const { loadManifestEmbeddings } = await import("../../../src/helpers/vectorSearch/loader.js");
    const result = await loadManifestEmbeddings();
    expect(result).toEqual(sample);
    expect(fetchJsonMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when manifest fetch fails", async () => {
    const { fetchJson } = await import("../../../src/helpers/dataUtils.js");
    fetchJson.mockRejectedValue(new Error("fail"));
    const { loadManifestEmbeddings } = await import("../../../src/helpers/vectorSearch/loader.js");
    const result = await loadManifestEmbeddings();
    expect(result).toBeNull();
  });

  it("retries loading embeddings after transient failure", async () => {
    process.env.RAG_FORCE_JSON = "1";
    global.window = {};
    const { fetchJson } = await import("../../../src/helpers/dataUtils.js");
    fetchJson.mockReset();
    fetchJson
      .mockRejectedValueOnce(new Error("single-file fail"))
      .mockRejectedValueOnce(new Error("manifest fail"))
      .mockResolvedValue(sample);

    const loaderModule = await import("../../../src/helpers/vectorSearch/loader.js");

    const firstResult = await withMutedConsole(() => loaderModule.loadEmbeddings());
    expect(firstResult).toBeNull();
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(fetchJson.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining("client_embeddings.json"),
      expect.stringContaining("client_embeddings.manifest.json")
    ]);

    const secondResult = await loaderModule.loadEmbeddings();
    expect(secondResult).toEqual(sample);
    expect(fetchJson).toHaveBeenCalledTimes(3);
    expect(fetchJson.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining("client_embeddings.json"),
      expect.stringContaining("client_embeddings.manifest.json"),
      expect.stringContaining("client_embeddings.json")
    ]);

    const cachedResult = await loaderModule.loadEmbeddings();
    expect(cachedResult).toBe(secondResult);
    expect(fetchJson).toHaveBeenCalledTimes(3);
  });
});
