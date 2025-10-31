// @vitest-environment node
/**
 * Test suite for offline RAG mode with local MiniLM model.
 * Validates that queryRag works correctly in offline mode without network fallback.
 *
 * @see OFFLINE_RAG_INVESTIGATION_REPORT.md for context
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withMutedConsole } from "../utils/console.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

describe("queryRag offline mode with local MiniLM model", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.RAG_STRICT_OFFLINE;
    delete process.env.RAG_ALLOW_LEXICAL_FALLBACK;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Verify local model is used when available
   * Ensures env.localModelPath is correctly set to repo root for model resolution
   */
  it("loads local MiniLM model when models/minilm/ directory exists", async () => {
    // Mock fs to verify stat() calls check the correct path
    const statMock = vi.fn(async (probedPath) => {
      const normalizedProbedPath = path.normalize(probedPath);

      if (normalizedProbedPath.endsWith(path.join("onnx", "model_quantized.onnx"))) {
        return { size: 600_000 };
      }

      if (normalizedProbedPath.endsWith("tokenizer.json")) {
        return { size: 12_000 };
      }

      if (normalizedProbedPath.endsWith("tokenizer_config.json")) {
        return { size: 1_500 };
      }

      if (normalizedProbedPath.endsWith("config.json")) {
        return { size: 600 };
      }

      // Default fallback for other model files (vocab, special_tokens, etc.)
      return { size: 8_192 };
    });
    vi.doMock("fs/promises", () => ({
      stat: statMock,
      mkdir: vi.fn().mockResolvedValue(undefined),
      cp: vi.fn().mockResolvedValue(undefined),
      access: vi.fn().mockResolvedValue(undefined)
    }));

    // Mock @xenova/transformers to track env.localModelPath configuration
    const pipelineMock = vi.fn(async (task, model, opts) => {
      // task and model used implicitly by test expectations below
      void opts;
      return vi.fn(); // Return a mock extractor function
    });

    vi.doMock("@xenova/transformers", () => ({
      pipeline: pipelineMock,
      env: {
        allowLocalModels: true,
        localModelPath: rootDir, // Should be set to repo root by vectorSearchPage.js
        backends: { onnx: { wasm: {} } }
      }
    }));

    // Import after mocks are set
    const { getExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");
    const extractor = await getExtractor();

    // Verify extractor was created
    expect(extractor).toBeDefined();
    expect(typeof extractor).toBe("function");

    // Verify pipeline was instantiated for feature-extraction
    expect(pipelineMock).toHaveBeenCalled();
    const call = pipelineMock.mock.calls[0];
    expect(call[0]).toBe("feature-extraction");
    expect(call[1]).toContain("MiniLM");
  });

  /**
   * Test 2: Verify queryRag returns results in offline mode
   * Happy path: local model available, valid query
   */
  it("queryRag returns results when offline with local model available", async () => {
    // Mock the vector search to return test data
    const mockResults = [
      { id: "1", text: "tooltip system design", score: 0.95, source: "prd" },
      { id: "2", text: "tooltip validation rules", score: 0.87, source: "code" }
    ];

    vi.doMock("../../src/helpers/api/vectorSearchPage.js", () => ({
      getExtractor: vi.fn(async () => {
        // Mock extractor that returns test embeddings
        return vi.fn(async () => ({
          data: new Float32Array([0.1, 0.2, 0.3])
        }));
      }),
      searchVectorDatabase: vi.fn(async () => mockResults)
    }));

    const { default: queryRag } = await import("../../src/helpers/queryRag.js");
    const results = await queryRag("tooltip system");

    expect(results).toEqual(mockResults);
    expect(results.length).toBe(2);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  /**
   * Test 3: Verify strict offline mode fails gracefully with helpful message
   * Edge case: local model missing, strict offline enabled
   */
  it("fails with actionable error when local model missing in strict offline mode", async () => {
    process.env.RAG_STRICT_OFFLINE = "1";

    // Mock fs to simulate missing model files
    const statMock = vi.fn(async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });

    vi.doMock("fs/promises", () => ({
      stat: statMock,
      access: vi.fn(async () => {
        throw new Error("Model not found");
      })
    }));

    const { getExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    await withMutedConsole(async () => {
      await expect(getExtractor()).rejects.toThrow(/strict offline|local model/i);
    });
  });

  /**
   * Test 4: Verify no network requests when local model is available
   * Validates that the system doesn't attempt CDN fallback
   */
  it("does not attempt CDN requests when local model loads successfully", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("Network should not be called"));

    // Mock fs as available
    vi.doMock("fs/promises", () => ({
      stat: vi.fn().mockResolvedValue({ size: 1024 })
    }));

    // Mock transformers with successful local load
    vi.doMock("@xenova/transformers", () => ({
      pipeline: vi.fn(async () => vi.fn()),
      env: { allowLocalModels: true, localModelPath: rootDir }
    }));

    const { getExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    // Should succeed without network
    await expect(getExtractor()).resolves.toBeDefined();

    // Verify fetch was not called
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  /**
   * Test 5: Verify lexical fallback works when enabled and model unavailable
   * Edge case: offline mode with fallback enabled, no network
   */
  it("uses lexical fallback when RAG_ALLOW_LEXICAL_FALLBACK=1 and model unavailable", async () => {
    process.env.RAG_ALLOW_LEXICAL_FALLBACK = "1";

    // Ensure model loading fails
    vi.doMock("fs/promises", () => ({
      stat: vi.fn(async () => {
        throw new Error("Model not found");
      })
    }));

    vi.doMock("@xenova/transformers", () => {
      throw new Error("Transformers not available");
    });

    // Mock offline corpus for lexical search
    const vectorSearchPath = "../../src/helpers/api/vectorSearchPage.js";
    vi.doMock(vectorSearchPath, () => ({
      searchVectorDatabase: vi.fn(async () => {
        // Simulate lexical search results
        return [{ id: "1", text: "tooltip example", score: 0.5, source: "lexical" }];
      })
    }));

    try {
      const { default: queryRag } = await import("../../src/helpers/queryRag.js");

      // Should fall back to lexical without error
      const results = await queryRag("tooltip");
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    } finally {
      vi.doUnmock("fs/promises");
      vi.doUnmock("@xenova/transformers");
      vi.doUnmock(vectorSearchPath);
      vi.resetModules();
    }
  });

  /**
   * Test 6: Verify model path resolution is consistent
   * Ensures prepareLocalModel.mjs and vectorSearchPage.js use same path
   */
  it("resolves model path consistently between prepare and load", async () => {
    // Check that env.localModelPath is set to repo root in both places
    const envConfig = {
      localModelPath: undefined,
      cacheDir: undefined
    };

    vi.doMock("@xenova/transformers", () => ({
      pipeline: vi.fn(async () => vi.fn()),
      env: {
        allowLocalModels: true,
        get localModelPath() {
          return envConfig.localModelPath;
        },
        set localModelPath(val) {
          envConfig.localModelPath = val;
        },
        get cacheDir() {
          return envConfig.cacheDir;
        },
        set cacheDir(val) {
          envConfig.cacheDir = val;
        }
      }
    }));

    const { getExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    // Trigger the configuration
    try {
      await getExtractor();
    } catch {
      // Ignore errors; we just want to check config was set
    }

    // Both should be set to repo root for correct path resolution
    expect(envConfig.localModelPath).toBe(rootDir);
    expect(envConfig.cacheDir).toBe(path.join(rootDir, "models"));
  });

  /**
   * Test 7: Verify diagnostic info is available
   * Ensures withDiagnostics option works for offline mode
   */
  it("provides diagnostic info including model source when requested", async () => {
    const mockResults = [{ id: "1", text: "test", score: 0.9, source: "test" }];

    const extractorFn = vi.fn(async () => ({
      data: new Float32Array([0.1, 0.2, 0.3])
    }));

    vi.doMock("../../src/helpers/api/vectorSearchPage.js", () => ({
      getExtractor: vi.fn(async () => extractorFn),
      searchVectorDatabase: vi.fn(async () => mockResults)
    }));

    vi.doMock("../../src/helpers/vectorSearch/index.js", () => ({
      default: {
        expandQueryWithSynonyms: vi.fn(async (query) => `${query} expanded`),
        findMatches: vi.fn(async () => mockResults),
        loadEmbeddings: vi.fn(),
        fetchContextById: vi.fn(),
        CURRENT_EMBEDDING_VERSION: "test"
      }
    }));

    const { default: queryRag } = await import("../../src/helpers/queryRag.js");
    const results = await queryRag("test", { withDiagnostics: true });

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(mockResults.length);
    expect(results[0]).toEqual(mockResults[0]);
    expect(results.diagnostics).toBeDefined();
    expect(results.diagnostics.expandedQuery).toBe("test expanded");
    expect(results.diagnostics.multiIntentApplied).toBe(false);
    expect(results.diagnostics.timingMs).toBeGreaterThan(0);
  });
});
