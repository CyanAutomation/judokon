// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
    vi.clearAllMocks();
  });

  it("loads offline embeddings", async () => {
    vi.doMock("node:url", () => ({ fileURLToPath: (u) => u }));
    vi.doMock("node:fs/promises", () => ({ readFile: vi.fn() }));
    const meta = {
      vectorLength: 2,
      items: sample.map(({ id, text, source, tags }) => ({ id, text, source, tags }))
    };
    const vec = Buffer.from(new Float32Array(sample.flatMap((s) => s.embedding)).buffer);
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
});
