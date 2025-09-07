// @vitest-environment node
import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";
import { parseCssVars } from "./parseCssVars.js";

describe("meditation quote color contrast", () => {
  const vars = parseCssVars("src/styles/base.css");

  it("quote text vs block background is >= 4.5", () => {
    expect(vars["--color-text-inverted"]).toBeDefined();
    expect(vars["--color-secondary"]).toBeDefined();
    const ratio = hex(vars["--color-secondary"], vars["--color-text-inverted"]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
