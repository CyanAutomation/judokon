// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import postcss from "postcss";

/**
 * Return the first PostCSS rule matching selector.
 * @pseudocode
 * parse css -> walk rules -> return matching rule
 */
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

describe("touch target sizes", () => {
  const bottomNavbarCss = readFileSync("src/styles/bottom-navbar.css", "utf8");
  const layoutCss = readFileSync("src/styles/layout.css", "utf8");

  it("bottom navbar list items are touch sized", () => {
    const rule = getRule(bottomNavbarCss, ".bottom-navbar ul li");
    expect(rule).toBeTruthy();
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const minWidth = rule.nodes.find((d) => d.prop === "min-width")?.value;
    expect(minHeight).toBe("var(--touch-target-size)");
    expect(minWidth).toBe("var(--touch-target-size)");
  });

  it("bottom navbar links are touch sized", () => {
    const rule = getRule(bottomNavbarCss, ".bottom-navbar a");
    expect(rule).toBeTruthy();
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const minWidth = rule.nodes.find((d) => d.prop === "min-width")?.value;
    expect(minHeight).toBe("var(--touch-target-size)");
    expect(minWidth).toBe("var(--touch-target-size)");
  });

  it("header logo link is touch sized", () => {
    const rule = getRule(layoutCss, ".logo-container a");
    expect(rule).toBeTruthy();
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const minWidth = rule.nodes.find((d) => d.prop === "min-width")?.value;
    expect(minHeight).toBe("var(--touch-target-size)");
    expect(minWidth).toBe("var(--touch-target-size)");
  });
});
