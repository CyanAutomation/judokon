import { describe, it, expect, vi } from "vitest";
import { seededRandom, setTestMode } from "../../src/helpers/testModeUtils.js";

describe("testModeUtils", () => {
  it("returns reproducible sequences in test mode", () => {
    setTestMode(true, 5);
    const seq1 = [seededRandom(), seededRandom(), seededRandom()];
    setTestMode(true, 5);
    const seq2 = [seededRandom(), seededRandom(), seededRandom()];
    expect(seq2).toEqual(seq1);
  });

  it("uses Math.random when test mode is disabled", () => {
    const original = Math.random;
    const spy = vi.fn(() => 0.42);
    Math.random = spy;
    setTestMode(false);
    const value = seededRandom();
    Math.random = original;
    expect(spy).toHaveBeenCalled();
    expect(value).toBe(0.42);
  });
});
