// @vitest-environment node
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  getCurrentSeed,
  seededRandom,
  setTestMode,
} from "../../src/helpers/testModeUtils.js";

describe("testModeUtils", () => {
  afterEach(() => {
    setTestMode(false);
  });

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

  it("accepts a zero seed without falling back to the default", () => {
    setTestMode({ enabled: true, seed: 0 });
    expect(getCurrentSeed()).toBe(0);
    expect(seededRandom()).toBe(0);
  });

  it("accepts positive and negative seeds", () => {
    setTestMode({ enabled: true, seed: 7 });
    expect(getCurrentSeed()).toBe(7);

    setTestMode({ enabled: true, seed: -3 });
    expect(getCurrentSeed()).toBe(-3);
  });

  it("falls back to the default seed when invalid values are provided", () => {
    const invalidSeeds = [Number.NaN, Infinity, undefined, null];

    for (const invalidSeed of invalidSeeds) {
      setTestMode({ enabled: true, seed: invalidSeed });
      expect(getCurrentSeed()).toBe(1);
      setTestMode(false);
    }
  });
});
