/* eslint-env node */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// Use the real offline index, mock the model pipeline, and ensure fs is used over fetch.
describe("RAG offline path (binary index)", () => {
  const saved = {
    window: global.window,
    document: global.document,
    fetch: global.fetch
  };

  let fsMock;
  let vectorLength;

  beforeAll(async () => {
    // Ensure loader does not force JSON path in this suite
    delete process.env.RAG_FORCE_JSON;
    // Force Node environment code paths by removing window/document during module import.
    // This ensures loader/getExtractor prefer Node logic.
    // Save and delete globals (will restore in afterAll).
    // Note: jsdom environment is still active, but these deletions affect our modules.

    delete global.window;

    delete global.document;

    // Build the offline assets from the current client_embeddings.json
    const { buildOfflineRag } = await import("../../scripts/buildOfflineRag.mjs");
    await buildOfflineRag();

    // Read metadata to determine vector length for a consistent stub embedding shape
    const path = await import("node:path");
    const { readFile } = await import("node:fs/promises");
    const metaPath = path.resolve(process.cwd(), "src/data/offline_rag_metadata.json");
    const meta = JSON.parse(await readFile(metaPath, "utf8"));
    vectorLength = Number(meta.vectorLength || 384);

    // Spy on fs.readFile and hard-fail if any code attempts to call fetch
    // Mock fs/promises to wrap readFile so we can assert calls in ESM
    vi.doMock("node:fs/promises", async () => {
      const real = await vi.importActual("node:fs/promises");
      const wrapped = function readFile(...args) {
        return real.readFile.apply(real, args);
      };
      return {
        ...real,
        readFile: vi.fn(wrapped)
      };
    });
    fsMock = await import("node:fs/promises");
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("fetch should not be called in offline mode"))
    );

    // Mock Transformers to a stub feature-extraction pipeline that returns a zero vector
    vi.doMock("@xenova/transformers", () => {
      const env = { allowLocalModels: false };
      const pipeline = async () => {
        return async () => ({ data: new Float32Array(vectorLength) });
      };
      return { pipeline, env };
    });

    // Reset module cache so our env + mocks are respected on import
    vi.resetModules();
  });

  afterAll(() => {
    // Restore globals
    if (saved.window !== undefined) global.window = saved.window;
    if (saved.document !== undefined) global.document = saved.document;
    global.fetch = saved.fetch;
    // Restore mocked module if needed
    try {
      vi.resetModules();
    } catch {}
  });

  it("loads embeddings from binary and never calls fetch; query + context works end-to-end", async () => {
    // Import after mocks and env tweaks
    const queryRag = (await import("../../src/helpers/queryRag.js")).default;
    const vectorSearch = (await import("../../src/helpers/vectorSearch/index.js")).default;
    const { fetchContextById } = await import("../../src/helpers/vectorSearch/context.js");

    // Perform an end-to-end query. Using tokens that appear in architecture docs
    const matches = await queryRag("viewport simulation");

    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);

    // Assert embeddings loader used the offline binary and metadata files
    const calls = (fsMock.readFile.mock.calls || []).map((c) => String(c[0]));
    const usedMeta = calls.some((p) => p.includes("offline_rag_metadata.json"));
    const usedBin = calls.some((p) => p.includes("offline_rag_vectors.bin"));
    expect(usedMeta).toBe(true);
    expect(usedBin).toBe(true);

    // No network fetch for offline path
    expect(global.fetch).toHaveBeenCalledTimes(0);

    // Validate context loading around the first result id
    // Validate context loading on a known PRD id (independent check)
    const context = await fetchContextById("prdVectorDatabaseRAG.md-chunk-1", 1);
    expect(Array.isArray(context)).toBe(true);

    // Sanity-check scoring path: findMatches returns similar results when called directly
    const direct = await vectorSearch.findMatches(
      new Array(vectorLength).fill(0),
      5,
      [],
      "viewport simulation"
    );
    expect(Array.isArray(direct)).toBe(true);
    expect(direct.length).toBeGreaterThan(0);
  });
});
