// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { hex } from "wcag-contrast";
import { parseCssVariables } from "../../src/helpers/cssVariableParser.js";

function getBaseVars() {
  const css = readFileSync(resolve("src/styles/base.css"), "utf8");
  return parseCssVariables(css);
}

describe("meditation quote color contrast", () => {
  const vars = getBaseVars();

  it("quote text vs block background is >= 4.5", () => {
    expect(vars["--color-text-inverted"]).toBeDefined();
    expect(vars["--color-secondary"]).toBeDefined();
    const ratio = hex(vars["--color-secondary"], vars["--color-text-inverted"]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
