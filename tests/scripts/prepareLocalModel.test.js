// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, stat, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function createSeedModelDir() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "minilm-seed-"));
  const onnxDir = path.join(tmp, "onnx");
  await mkdir(onnxDir, { recursive: true });
  await writeFile(path.join(tmp, "config.json"), "{}", "utf8");
  await writeFile(path.join(tmp, "tokenizer.json"), "{}", "utf8");
  await writeFile(path.join(tmp, "tokenizer_config.json"), "{}", "utf8");
  await writeFile(path.join(onnxDir, "model_quantized.onnx"), Buffer.from([1, 2, 3]));
  return tmp;
}

describe("prepareLocalModel", () => {
  it("copies required files from --from-dir into src/models/minilm", async () => {
    const seed = await createSeedModelDir();
    const { prepareLocalModel } = await import("../../scripts/prepareLocalModel.mjs");

    // Clean any existing dest
    await rm(path.join(process.cwd(), "src", "models", "minilm"), { recursive: true, force: true });

    const res = await prepareLocalModel({ fromDir: seed });
    expect(res.ok).toBe(true);
    expect(res.source).toBe("from-dir");

    const expected = [
      "config.json",
      "tokenizer.json",
      "tokenizer_config.json",
      path.join("onnx", "model_quantized.onnx")
    ];
    for (const rel of expected) {
      const p = path.join(process.cwd(), "src", "models", "minilm", rel);
      const s = await stat(p);
      expect(s.size).toBeGreaterThan(0);
    }
  });

  it("allows getExtractor to use local model path when present", async () => {
    // Arrange: ensure minimal config exists to take local path branch
    const dest = path.join(process.cwd(), "src", "models", "minilm");
    await mkdir(path.join(dest, "onnx"), { recursive: true });
    await writeFile(path.join(dest, "config.json"), "{}", "utf8");

    // Mock transformers pipeline; ensure called with local modelDir not remote name
    const pipelineMock = vi.fn(async () => ({
      // Dummy extractor that returns small vector-like result
      apply: async (t) => [0, 0]
    }));
    vi.doMock("@xenova/transformers", () => ({
      pipeline: pipelineMock,
      env: { allowLocalModels: false, localModelPath: "", backends: { onnx: { wasm: {} } } }
    }));

    // Ensure stat check passes regardless of environment peculiarities
    vi.doMock("fs/promises", () => ({
      stat: vi.fn(async () => ({ size: 1 }))
    }));

    // Act
    const { getExtractor } = await import("../../src/helpers/api/vectorSearchPage.js");
    await getExtractor();

    // Assert
    expect(pipelineMock).toHaveBeenCalled();
    const args = pipelineMock.mock.calls[0];
    expect(args[0]).toBe("feature-extraction");
    // Second arg should be a path ending with models/minilm
    expect(String(args[1])).toMatch(/models[\\\/]minilm$/);
  });
});
