// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { hex } from "wcag-contrast";
import postcss from "postcss";

function getBaseVars() {
  const css = readFileSync(resolve("src/styles/base.css"), "utf8");
  const vars = {};
  const root = postcss.parse(css);
  root.walkRules(":root", (rule) => {
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith("--")) {
        vars[decl.prop] = decl.value.trim();
      }
    });
  });
  return vars;
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
