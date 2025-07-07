import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { hex } from "wcag-contrast";
import { parseCssVariables } from "../../src/helpers/cssVariableParser.js";

function getCssVars() {
  const css = readFileSync(resolve("src/styles/base.css"), "utf8");
  return parseCssVariables(css);
}

describe("base.css color contrast", () => {
  const vars = getCssVars();
  const pairs = [
    ["--button-bg", "--button-text-color"],
    ["--button-hover-bg", "--button-text-color"],
    ["--button-active-bg", "--button-text-color"],
    ["--color-secondary", "--color-surface"],
    ["--color-primary", "--color-surface"],
    ["--color-tertiary", "--color-secondary"],
    ["--color-text", "--color-background"],
    ["--color-primary", "--color-background"],
    ["--color-secondary", "--color-background"],
    ["--color-tertiary", "--color-text"],
    ["--color-surface", "--color-text"]
  ];

  it("all referenced CSS variables exist", () => {
    const allVars = new Set(pairs.flat());
    for (const v of allVars) {
      expect(vars[v]).toBeDefined();
    }
  });

  it.each(pairs)("%s vs %s should be >= 4.5", (a, b) => {
    expect(vars[a]).toBeDefined();
    expect(vars[b]).toBeDefined();
    const ratio = hex(vars[a], vars[b]);
    expect(ratio).toBeGreaterThanOrEqual(
      4.5,
      `Contrast ratio between ${a} (${vars[a]}) and ${b} (${vars[b]}) is ${ratio}, which is less than the required 4.5.`
    );
  });
});
