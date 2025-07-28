// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import postcss from "postcss";

function getLiRule(css) {
  const root = postcss.parse(css);
  let target;
  root.walkRules((rule) => {
    if (rule.selector === ".bottom-navbar ul li") {
      target = rule;
    }
  });
  return target;
}

describe("bottom-navbar touch target", () => {
  it("li elements are at least 48px tall", () => {
    const css = readFileSync("src/styles/bottom-navbar.css", "utf8");
    const rule = getLiRule(css);
    expect(rule).toBeTruthy();
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const padding = rule.nodes.find((d) => d.prop === "padding")?.value;
    expect(minHeight).toBeDefined();
    expect(minHeight).toBe("var(--touch-target-size)");
    expect(padding).toBeDefined();
  });
});
