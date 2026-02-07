import { describe, expect, it } from "vitest";
import {
  getBaseSelectionReadyDelay,
  getSelectionDelayOverride,
  computeDelayWithOpponentBuffer
} from "../../../src/helpers/classicBattle/selectionDelayCalculator.js";

describe("selectionDelayCalculator", () => {
  it("returns a stable base selection-ready delay", () => {
    expect(getBaseSelectionReadyDelay()).toBe(150);
  });

  it("reads the global opponent resolve override when present", () => {
    const original = globalThis.__OPPONENT_RESOLVE_DELAY_MS;
    globalThis.__OPPONENT_RESOLVE_DELAY_MS = 275;
    expect(getSelectionDelayOverride()).toBe(275);
    if (original === undefined) {
      delete globalThis.__OPPONENT_RESOLVE_DELAY_MS;
    } else {
      globalThis.__OPPONENT_RESOLVE_DELAY_MS = original;
    }
  });

  it("applies buffer to opponent delay", () => {
    expect(computeDelayWithOpponentBuffer(300)).toBe(450);
    expect(computeDelayWithOpponentBuffer(300, 25)).toBe(325);
  });
});
