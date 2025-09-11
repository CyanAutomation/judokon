// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

describe("checkRagPreflight", () => {
  it("passes when offline artifacts consistent and strict offline disabled", async () => {
    // Mock fs to simulate consistent artifacts
    vi.doMock("node:fs/promises", () => ({
      readFile: vi.fn(async (p, enc) => {
        const pathStr = String(p);
        if (pathStr.endsWith("offline_rag_metadata.json")) {
          return JSON.stringify({ vectorLength: 3, count: 2, items: [] });
        }
        // vectors.bin length must be vectorLength * count = 6 bytes
        return Buffer.from([1, 2, 3, 4, 5, 6]);
      }),
      stat: vi.fn(async () => ({ size: 1 }))
    }));

    const mod = await import("../../scripts/checkRagPreflight.mjs");
    const res = await mod.checkPreflight();
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("reports missing model files when strict offline is enabled", async () => {
    vi.doMock("node:fs/promises", () => ({
      readFile: vi.fn(async (p, enc) => {
        if (String(p).endsWith("offline_rag_metadata.json")) {
          return JSON.stringify({ vectorLength: 1, count: 1, items: [] });
        }
        return Buffer.from([7]);
      }),
      stat: vi.fn(async (p) => {
        // Simulate ENOENT for model files by throwing on paths containing /models/minilm/
        const s = String(p);
        if (s.includes("models") && s.includes("minilm")) {
          throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        }
        return { size: 1 };
      })
    }));

    const mod = await import("../../scripts/checkRagPreflight.mjs");
    const res = await mod.checkStrictOfflineModel({ RAG_STRICT_OFFLINE: "1" });
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

