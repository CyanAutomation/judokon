import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mapping = { letters: { a: ["ア"], b: ["バ"], c: ["カ"] } };

describe("convertToPseudoJapanese", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("converts letters and replaces unmapped characters", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { convertToPseudoJapanese } = await import("../../src/helpers/pseudoJapanese.js");
    const result = await convertToPseudoJapanese("Ab1!");
    expect(result).toBe("アバア");
  });

  it("returns static fallback when json fails to load", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));
    const { convertToPseudoJapanese } = await import("../../src/helpers/pseudoJapanese.js");
    const result = await convertToPseudoJapanese("abc");
    expect(result).toBe("\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8");
  });
});
