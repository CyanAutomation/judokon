// @vitest-environment node
import { afterEach, describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

// ===== Top-level vi.mock() for node:fs/promises =====
const mockReadFile = vi.fn();
const mockStat = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
  stat: mockStat
}));

describe("checkRagPreflight", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mockReadFile.mockClear();
    mockStat.mockClear();
  });

  it("passes when offline artifacts consistent and strict offline disabled", async () => {
    // Configure mocks for this test
    mockReadFile.mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr.endsWith("offline_rag_metadata.json")) {
        return JSON.stringify({ vectorLength: 3, count: 2, items: [] });
      }
      // vectors.bin length must be vectorLength * count = 6 bytes
      return Buffer.from([1, 2, 3, 4, 5, 6]);
    });
    mockStat.mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr.includes("models") && pathStr.includes("minilm")) {
        if (pathStr.endsWith("onnx/model_quantized.onnx")) {
          return { size: 600 * 1024 };
        }
        return { size: 5_000 };
      }
      return { size: 1 };
    });

    vi.resetModules();
    const mod = await import("../../scripts/checkRagPreflight.mjs");
    const res = await mod.checkPreflight();
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("reports missing model files when strict offline is enabled", async () => {
    mockReadFile.mockImplementation(async (p) => {
      if (String(p).endsWith("offline_rag_metadata.json")) {
        return JSON.stringify({ vectorLength: 1, count: 1, items: [] });
      }
      return Buffer.from([7]);
    });
    mockStat.mockImplementation(async (p) => {
      // Simulate ENOENT for model files by throwing on paths containing /models/minilm/
      const s = String(p);
      if (s.includes("models") && s.includes("minilm")) {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }
      return { size: 1 };
    });

    vi.resetModules();
    const mod = await import("../../scripts/checkRagPreflight.mjs");
    const res = await mod.checkStrictOfflineModel({ RAG_STRICT_OFFLINE: "1" });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("warns when model files missing and strict offline disabled", async () => {
    mockReadFile.mockImplementation(async () => Buffer.from([1]));
    mockStat.mockImplementation(async (p) => {
      // missing model files
      if (String(p).includes("models") && String(p).includes("minilm")) {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }
      return { size: 1 };
    });

    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("../../scripts/checkRagPreflight.mjs");

    await withMutedConsole(async () => {
      const res = await mod.checkStrictOfflineModel({});
      expect(res.ok).toBe(true);
      expect(res.errors).toEqual([]);
    }, ["error"]);

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/Offline model files missing in models\/minilm \(/);
    expect(warnSpy.mock.calls[0][0]).toMatch(
      /npm run rag:prepare:models -- --from-dir \/path\/to\/minilm/
    );
  });

  it("warns when local MiniLM artifacts appear truncated in non-strict mode", async () => {
    mockReadFile.mockImplementation(async () => Buffer.from([1]));
    mockStat.mockImplementation(async (p) => {
      const s = String(p);
      if (s.includes("models") && s.includes("minilm")) {
        if (s.endsWith("onnx/model_quantized.onnx")) {
          return { size: 10 };
        }
        return { size: 5_000 };
      }
      return { size: 1 };
    });

    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("../../scripts/checkRagPreflight.mjs");

    const res = await withMutedConsole(async () => mod.checkStrictOfflineModel({}), ["error"]);

    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(warnSpy).toHaveBeenCalledOnce();
    const warning = warnSpy.mock.calls[0][0];
    expect(warning).toMatch(
      /Model file appears truncated in models\/minilm: .*model_quantized\.onnx/
    );
    expect(warning).toMatch(/npm run rag:prepare:models -- --from-dir \/path\/to\/minilm/);
  });

  it("fails when local MiniLM artifacts appear truncated in strict mode", async () => {
    mockReadFile.mockImplementation(async () => Buffer.from([1]));
    mockStat.mockImplementation(async (p) => {
      const s = String(p);
      if (s.includes("models") && s.includes("minilm")) {
        if (s.endsWith("onnx/model_quantized.onnx")) {
          return { size: 10 };
        }
        return { size: 5_000 };
      }
      return { size: 1 };
    });

    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("../../scripts/checkRagPreflight.mjs");

    const res = await withMutedConsole(
      async () => mod.checkStrictOfflineModel({ RAG_STRICT_OFFLINE: "1" }),
      ["error"]
    );

    expect(res.ok).toBe(false);
    expect(res.errors[0]).toMatch(
      /^Strict offline: Model file appears truncated in models\/minilm: .*model_quantized\.onnx/
    );
    expect(res.errors[res.errors.length - 1]).toMatch(
      /Run "npm run rag:prepare:models -- --from-dir \/path\/to\/minilm"/
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("accepts MiniLM artifacts that meet the minimum size thresholds", async () => {
    mockReadFile.mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr.endsWith("offline_rag_metadata.json")) {
        return JSON.stringify({ vectorLength: 2, count: 2, items: [] });
      }
      return Buffer.from([1, 2, 3, 4]);
    });
    mockStat.mockImplementation(async (p) => {
      const pathStr = String(p);
      if (pathStr.includes("models") && pathStr.includes("minilm")) {
        if (pathStr.endsWith("config.json")) {
          return { size: 400 };
        }
        if (pathStr.endsWith("tokenizer.json")) {
          return { size: 1_000 };
        }
        if (pathStr.endsWith("tokenizer_config.json")) {
          return { size: 400 };
        }
        if (pathStr.endsWith("onnx/model_quantized.onnx")) {
          return { size: 300 * 1024 };
        }
      }
      return { size: 1 };
    });

    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("../../scripts/checkRagPreflight.mjs");

    const res = await mod.checkStrictOfflineModel({});

    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
