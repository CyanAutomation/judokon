// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

// ===== Top-level vi.mock() calls for RAG strict offline mode =====
const pipelineMock = vi.fn();

vi.mock("@xenova/transformers", () => ({
  pipeline: pipelineMock,
  env: { allowLocalModels: false, localModelPath: "", backends: { onnx: { wasm: {} } } }
}));

vi.mock("fs/promises", () => ({
  stat: vi.fn(async () => {
    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  })
}));

describe("getExtractor strict offline mode", () => {
  it("throws with actionable message when local model is missing and RAG_STRICT_OFFLINE=1", async () => {
    pipelineMock.mockClear();
    process.env.RAG_STRICT_OFFLINE = "1";
    vi.resetModules();
    const { getExtractor } = await import("../../src/helpers/api/ragExtractor.js");

    await withMutedConsole(async () => {
      await expect(getExtractor()).rejects.toThrow(/Strict offline mode: local model missing/i);
    });

    // Ensure we never attempted to call the remote or local pipeline
    expect(pipelineMock).not.toHaveBeenCalled();

    delete process.env.RAG_STRICT_OFFLINE;
  });
});
