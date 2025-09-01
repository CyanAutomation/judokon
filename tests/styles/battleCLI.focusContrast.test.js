import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";

// Focus visuals for Battle CLI: ensure adequate contrast for accessibility
// - Focus ring vs page background (non-text contrast, target >= 3.0)
// - Focused .cli-stat background vs text color (text contrast, target >= 4.5)

describe("battleCLI focus contrast", () => {
  it("focus ring contrasts with page background (>= 3.0)", () => {
    const focusRing = "#9ad1ff";
    const pageBg = "#0b0c0c"; // body background in battleCLI.html
    const ratio = hex(focusRing, pageBg);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it("focused stat background contrasts with text (>= 4.5)", () => {
    const focusedStatBg = "#103a56"; // .cli-stat:focus background
    const textColor = "#f2f2f2"; // default body text
    const ratio = hex(focusedStatBg, textColor);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

