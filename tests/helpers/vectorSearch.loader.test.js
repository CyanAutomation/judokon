// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withAllowedConsole } from "../utils/console.js";
import { setupMockDataset, sample } from "./vectorSearch/mockDataset.js";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

let fetchJsonMock;

beforeEach(async () => {
  fetchJsonMock = await setupMockDataset();
});

afterEach(() => {
  fetchJsonMock.mockReset();
});

describe("vectorSearch loader", () => {
  it("loads embeddings once and caches", async () => {
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
    const first = await loadEmbeddings();
    const second = await loadEmbeddings();
    expect(first).toEqual(sample);
    expect(second).toBe(first);
    expect(fetchJsonMock).toHaveBeenCalledTimes(2); // manifest + shard
  });

  it("returns null when loading fails", async () => {
    await withAllowedConsole(async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      fetchJsonMock.mockImplementation((url) => {
        if (url.endsWith("client_embeddings.manifest.json")) {
          return Promise.reject(new Error("fail"));
        }
        return Promise.resolve(sample);
      });
      const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
      const result = await loadEmbeddings();
      expect(result).toBeNull();
      errorSpy.mockRestore();
    }, ["error"]);
  });
});
