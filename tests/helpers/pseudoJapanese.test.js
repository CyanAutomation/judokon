// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

// Minimal mapping for predictable testing
const mapping = {
  letters: { a: ["ア"], b: ["バ"], c: ["カ"], d: ["ダ"], e: ["エ"] }
};

const originalFetch = global.fetch;

describe("convertToPseudoJapanese", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("converts letters using the JSON mapping", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );

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

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );

    const result = await convertToPseudoJapanese("a1!b2?c3.");
    expect(result).toBe("アアバアカア");
  });

  it("preserves newline characters", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );

    const result = await convertToPseudoJapanese("one\ntwo");
    expect(result).toBe("アアエ\nアアア");
  });

  it("handles large input quickly", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.useFakeTimers();

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );

    const input = "a".repeat(999);

    const promise = convertToPseudoJapanese(input);
    vi.advanceTimersByTime(50); // Simulate 50 ms passing
    const result = await promise;

    expect(result).not.toBe("");
  });

  it("returns static fallback when the mapping fails to load", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    const result = await convertToPseudoJapanese("anything");
    expect(result).toBe("\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8");
  });

  it("handles empty string and null/undefined input", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    expect(await convertToPseudoJapanese("")).toBe("");
    expect(await convertToPseudoJapanese(null)).toBe("");
    expect(await convertToPseudoJapanese(undefined)).toBe("");
  });

  it("handles input with only unsupported characters", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => mapping });
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    expect(await convertToPseudoJapanese("123!@#")).toBe("");
  });

  it("returns fallback if mapping is missing 'letters' property", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    const result = await convertToPseudoJapanese("abc");
    expect(result).toBe("\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8");
  });

  it("handles mapping with multiple kana options per letter", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({
        letters: { a: ["ア", "ァ"], b: ["バ", "ビ"] }
      })
    });
    // Use Math.random to always pick the second option
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    expect(await convertToPseudoJapanese("ab")).toBe("ァビ");
  });
});
