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

describe("bottom-navbar touch target", () => {
  const css = readFileSync("src/styles/bottom-navbar.css", "utf8");

  it("li elements are at least 48px square", () => {
    const rule = getRule(css, ".bottom-navbar ul li");
    expect(rule).toBeTruthy();
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const minWidth = rule.nodes.find((d) => d.prop === "min-width")?.value;
    const padding = rule.nodes.find((d) => d.prop === "padding")?.value;
    expect(minHeight).toBe("var(--touch-target-size)");
    expect(minWidth).toBe("var(--touch-target-size)");
    expect(padding).toBeDefined();
  });

  it("link elements are at least 48px square", () => {
    const rule = getRule(css, ".bottom-navbar a");
    expect(rule).toBeTruthy();
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const minWidth = rule.nodes.find((d) => d.prop === "min-width")?.value;
    expect(minHeight).toBe("var(--touch-target-size)");
    expect(minWidth).toBe("var(--touch-target-size)");
  });
});
