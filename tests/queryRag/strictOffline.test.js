// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

describe("getExtractor strict offline mode", () => {
  it("throws with actionable message when local model is missing and RAG_STRICT_OFFLINE=1", async () => {
    process.env.RAG_STRICT_OFFLINE = "1";

    // Mock transformers to avoid heavy imports; pipeline should not be called in strict mode.
    const pipelineMock = vi.fn();
    vi.doMock("@xenova/transformers", () => ({
      pipeline: pipelineMock,
      env: { allowLocalModels: false, localModelPath: "", backends: { onnx: { wasm: {} } } }
    }));

    // Mock fs/promises.stat to simulate missing local model files and also skip ONNX worker stat
    vi.doMock("fs/promises", () => ({
      stat: vi.fn(async () => {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      })
    }));

    // Import after mocks
    const { getExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    await withMutedConsole(async () => {
      await expect(getExtractor()).rejects.toThrow(/Strict offline mode: local model missing/i);
    });

    // Ensure we never attempted to call the remote or local pipeline
    expect(pipelineMock).not.toHaveBeenCalled();

    delete process.env.RAG_STRICT_OFFLINE;
  });
});
