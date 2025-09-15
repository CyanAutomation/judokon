import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";

// Focus visuals for Battle CLI: ensure adequate contrast for accessibility
// Cases are data-driven to keep thresholds and colors centralized and consistent.

const NON_TEXT_AA_MIN = 3.0; // WCAG AA non-text (UI component focus indicator)
const TEXT_AA_MIN = 4.5; // WCAG AA text

const focusContrastCases = [
  {
    name: "focus ring vs page background",
    fg: "#9ad1ff", // focus ring color
    bg: "#0b0c0c", // page background in battleCLI.html
    min: NON_TEXT_AA_MIN
  },
  {
    name: "focused stat background vs text",
    fg: "#f2f2f2", // default body text
    bg: "#103a56", // .cli-stat:focus background
    min: TEXT_AA_MIN
  }
];

describe("battleCLI focus contrast", () => {
  for (const { name, fg, bg, min } of focusContrastCases) {
    it(`${name} (>= ${min})`, () => {
      const ratio = hex(bg, fg);
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  }
});
