// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withAllowedConsole } from "../utils/console.js";
import { setupMockDataset, sample } from "./vectorSearch/mockDataset.js";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn(),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

// Mock Node.js fs operations for testing
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn()
}));

let fetchJsonMock;
let readFileMock;

beforeEach(async () => {
  // Force JSON manifest path for loader in Node environment
  process.env.RAG_FORCE_JSON = "1";
  fetchJsonMock = await setupMockDataset();
  // Reset modules to clear any cached embeddings from previous tests
  vi.resetModules();
  
  // Set up readFile mock to work with the test dataset
  const { readFile } = await import("node:fs/promises");
  readFileMock = readFile;
  readFileMock.mockImplementation((path) => {
    if (path.includes("client_embeddings.json")) {
      return Promise.resolve(JSON.stringify(sample));
    }
    throw new Error("File not found");
  });
});

afterEach(() => {
  fetchJsonMock.mockReset();
  readFileMock.mockReset();
  delete process.env.RAG_FORCE_JSON;
});

describe("vectorSearch loader", () => {
  it("loads embeddings once and caches", async () => {
    const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
    const first = await loadEmbeddings();
    const second = await loadEmbeddings();
    expect(first).toEqual(sample);
    expect(second).toBe(first);
    expect(readFileMock).toHaveBeenCalledTimes(1); // single file read
  });

  it("returns null when loading fails", async () => {
    await withAllowedConsole(async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      // Make all fetchJson calls fail to test the failure scenario
      fetchJsonMock.mockImplementation(() => {
        return Promise.reject(new Error("fail"));
      });
      // Also make readFile fail for Node.js file system operations
      readFileMock.mockImplementation(() => {
        return Promise.reject(new Error("fail"));
      });
      const { loadEmbeddings } = await import("../../src/helpers/vectorSearch/loader.js");
      const result = await loadEmbeddings();
      expect(result).toBeNull();
      errorSpy.mockRestore();
    }, ["error"]);
  });
});
