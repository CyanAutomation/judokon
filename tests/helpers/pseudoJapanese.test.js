// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

// Minimal mapping for predictable testing
const mapping = {
  letters: { a: ["ア"], b: ["バ"], c: ["カ"], d: ["ダ"], e: ["エ"] }
};

describe("convertToPseudoJapanese", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("converts letters using the mapping", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: mapping }));
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
      const result = convertToPseudoJapanese(input);
      expect(result).toBe(expected);
    }
  });

  it("removes or replaces unsupported characters", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: mapping }));
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );

    const result = convertToPseudoJapanese("a1!b2?c3.");
    expect(result).toBe("アアバアカア");
  });

  it("preserves newline characters", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: mapping }));
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );

    const result = convertToPseudoJapanese("one\ntwo");
    expect(result).toBe("アアエ\nアアア");
  });

  it("handles large input quickly", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: mapping }));
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );

    const input = "a".repeat(999);

    const result = convertToPseudoJapanese(input);
    expect(result).not.toBe("");
  });

  it("returns static fallback when the mapping fails to load", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: null }));

    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    const result = convertToPseudoJapanese("anything");
    expect(result).toBe("\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8");
  });

  it("handles empty string and null/undefined input", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: mapping }));
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    expect(convertToPseudoJapanese("")).toBe("");
    expect(convertToPseudoJapanese(null)).toBe("");
    expect(convertToPseudoJapanese(undefined)).toBe("");
  });

  it("handles input with only unsupported characters", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: mapping }));
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    expect(convertToPseudoJapanese("123!@#")).toBe("");
  });

  it("returns fallback if mapping is missing 'letters' property", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({ default: {} }));
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    const result = convertToPseudoJapanese("abc");
    expect(result).toBe("\u65e5\u672c\u8a9e\u98a8\u30c6\u30ad\u30b9\u30c8");
  });

  it("handles mapping with multiple kana options per letter", async () => {
    vi.doMock("../../src/data/japaneseConverter.js", () => ({
      default: { letters: { a: ["ア", "ァ"], b: ["バ", "ビ"] } }
    }));
    // Use Math.random to always pick the second option
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const { convertToPseudoJapanese } = await import(
      "../../src/helpers/pseudoJapanese/converter.js"
    );
    expect(convertToPseudoJapanese("ab")).toBe("ァビ");
  });
});
