import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";

describe("CLI focus styles", () => {
  it("focus outline contrasts with background", () => {
    const contrast = hex("#9ad1ff", "#0b0c0c");
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it("cli-stat focus background contrasts with text", () => {
    const contrast = hex("#272727", "#f2f2f2");
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
