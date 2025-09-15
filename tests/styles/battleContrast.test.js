import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";

// Contrast requirements follow WCAG AA thresholds for text (>= 4.5)
// Colors sourced from the classic battle slot design palette.
// This test is data-driven to make additions/updates straightforward.

const TEXT_AA_MIN = 4.5;

const cases = [
  {
    name: "player slot bg vs text",
    fg: "#ffffff",
    bg: "#0c3f7a",
    min: TEXT_AA_MIN
  },
  {
    name: "opponent slot bg vs text",
    fg: "#ffffff",
    bg: "#cb2504",
    min: TEXT_AA_MIN
  }
];

describe("battle slot color contrast", () => {
  for (const { name, fg, bg, min } of cases) {
    it(`${name} (>= ${min})`, () => {
      const ratio = hex(bg, fg);
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  }
});
