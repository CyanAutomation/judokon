import { describe, it, expect, vi, afterEach } from "vitest";

// Minimal mapping for predictable testing
const mapping = {
  letters: { a: ["ア"], b: ["バ"], c: ["カ"], d: ["ダ"], e: ["エ"] }
};

const originalFetch = global.fetch;

describe("convertToPseudoJapanese", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("converts letters using the JSON mapping", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import("../../src/helpers/pseudoJapanese.js");

    const cases = [
      ["short", "abc", "アバカ"],
      ["long", "abcabcabcabc", "アバカアバカアバカアバカ"],
      ["mixed case", "AbCdE", "アバカダエ"]
    ];

    for (const [, input, expected] of cases) {
      const result = await convertToPseudoJapanese(input);
      expect(result).toBe(expected);
    }
  });

  it("removes or replaces unsupported characters", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import("../../src/helpers/pseudoJapanese.js");

    const result = await convertToPseudoJapanese("a1!b2?c3.");
    expect(result).toBe("アアバアカア");
  });

  it("preserves newline characters", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import("../../src/helpers/pseudoJapanese.js");

    const result = await convertToPseudoJapanese("one\ntwo");
    expect(result).toBe("アアエ\nアアア");
  });

  it("handles large input quickly", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.useFakeTimers();

    const { convertToPseudoJapanese } = await import("../../src/helpers/pseudoJapanese.js");

    const input = "a".repeat(999);

    const promise = convertToPseudoJapanese(input);
    vi.advanceTimersByTime(50); // Simulate 50 ms passing
    const result = await promise;

    expect(result).not.toBe("");
  });

  it("returns static fallback when the mapping fails to load", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    const { convertToPseudoJapanese } = await import("../../src/helpers/pseudoJapanese.js");
    const result = await convertToPseudoJapanese("anything");
    expect(result).toBe("\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8");
  });
});
