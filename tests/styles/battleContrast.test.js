import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";

describe("battle slot color contrast", () => {
  it("player slot background contrasts with text", () => {
    const contrast = hex("#0c3f7a", "#ffffff");
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it("opponent slot background contrasts with text", () => {
    const contrast = hex("#cb2504", "#ffffff");
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
