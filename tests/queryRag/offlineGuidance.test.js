// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

describe("getExtractor offline guidance", () => {
  it("suggests hydrating local model and flags when network is unreachable", async () => {
    const pipelineMock = vi.fn(async () => {
      const err = new Error("ENETUNREACH");
      err.code = "ENETUNREACH";
      throw err;
    });
    vi.doMock("@xenova/transformers", () => ({
      pipeline: pipelineMock,
      env: { allowLocalModels: false, localModelPath: "", backends: { onnx: { wasm: {} } } }
    }));
    vi.doMock("fs/promises", () => ({
      stat: vi.fn(async () => {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      })
    }));

    const { getExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");

    await withMutedConsole(async () => {
      await expect(getExtractor()).rejects.toThrow(
        /hydrate a local model.*RAG_STRICT_OFFLINE=1.*RAG_ALLOW_LEXICAL_FALLBACK=1/i
      );
    });

    expect(pipelineMock).toHaveBeenCalled();
    vi.resetModules();
    vi.doUnmock("@xenova/transformers");
    vi.doUnmock("fs/promises");
  });
});
