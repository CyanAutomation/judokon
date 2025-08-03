// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import postcss from "postcss";

function getRule(css, selector) {
  const root = postcss.parse(css);
  let target;
  root.walkRules((rule) => {
    if (rule.selector === selector) {
      target = rule;
    }
  });
  return target;
}

describe("header logo link tap target", () => {
  it("logo link is at least 48px square", () => {
    const css = readFileSync("src/styles/layout.css", "utf8");
    const rule = getRule(css, ".logo-container a");
    expect(rule).toBeTruthy();
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const minWidth = rule.nodes.find((d) => d.prop === "min-width")?.value;
    expect(minHeight).toBe("var(--touch-target-size)");
    expect(minWidth).toBe("var(--touch-target-size)");
  });
});
