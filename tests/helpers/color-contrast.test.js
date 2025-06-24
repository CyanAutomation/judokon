import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { hex } from "wcag-contrast";

function getCssVars() {
  const css = readFileSync(resolve("src/styles/base.css"), "utf8");
  const rootBlock = css.match(/:root\s*{([\s\S]*?)}/);
  const vars = {};
  if (rootBlock) {
    const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
    let m;
    while ((m = regex.exec(rootBlock[1])) !== null) {
      vars[`--${m[1]}`] = m[2].trim();
    }
  }
  return vars;
}

describe("base.css color contrast", () => {
  const vars = getCssVars();
  const pairs = [
    ["--button-bg", "--button-text-color"],
    ["--button-hover-bg", "--button-text-color"],
    ["--button-active-bg", "--button-text-color"],
    ["--color-secondary", "--color-surface"],
    ["--color-primary", "--color-surface"],
    ["--color-tertiary", "--color-secondary"]
  ];

  it.each(pairs)("%s vs %s should be >= 4.5", (a, b) => {
    const ratio = hex(vars[a], vars[b]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
