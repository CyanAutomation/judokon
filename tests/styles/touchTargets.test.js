// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import postcss from "postcss";
import { JSDOM } from "jsdom";

/**
 * Return PostCSS rules with touch target min-height/min-width declarations.
 * @pseudocode
 * parse css -> walk rules -> collect rules with touch target declarations
 */
function findTouchTargetRules(css) {
  const root = postcss.parse(css);
  const matches = [];
  root.walkRules((rule) => {
    const minHeight = rule.nodes.find((d) => d.prop === "min-height")?.value;
    const minWidth = rule.nodes.find((d) => d.prop === "min-width")?.value;
    const hasTouchTargetHeight = minHeight?.startsWith("var(--touch-target-size");
    const hasTouchTargetWidth = minWidth?.startsWith("var(--touch-target-size");
    if (hasTouchTargetHeight || hasTouchTargetWidth) {
      matches.push(rule);
    }
  });
  return matches;
}

describe("touch target sizes", () => {
  const navbarCss = readFileSync("src/styles/navbar.css", "utf8");
  const layoutCss = readFileSync("src/styles/layout.css", "utf8");

  it("navbar touch targets declare min-size using the touch target contract", () => {
    const rules = findTouchTargetRules(navbarCss);
    expect(rules.length).toBeGreaterThan(0);
  });

  it("layout touch targets declare min-size using the touch target contract", () => {
    const rules = findTouchTargetRules(layoutCss);
    expect(rules.length).toBeGreaterThan(0);
  });

  it("representative elements resolve min-size from the touch target contract", () => {
    const dom = new JSDOM(
      `<!doctype html>
      <html>
        <head></head>
        <body>
          <div class="filter-bar"><button type="button">Filter</button></div>
          <div class="logo-container"><a href="#">Logo</a></div>
        </body>
      </html>`,
      { pretendToBeVisual: true }
    );
    const { window } = dom;
    const { document } = window;
    const style = document.createElement("style");
    style.textContent = `:root { --touch-target-size: 48px; }\n${navbarCss}\n${layoutCss}`;
    document.head.appendChild(style);

    const filterButton = document.querySelector(".filter-bar button");
    const logoLink = document.querySelector(".logo-container a");
    expect(filterButton).toBeTruthy();
    expect(logoLink).toBeTruthy();

    const filterStyles = window.getComputedStyle(filterButton);
    const logoStyles = window.getComputedStyle(logoLink);
    const isTouchTargetValue = (value) =>
      value === touchTargetSize || value.startsWith("var(--touch-target-size");
    expect(isTouchTargetValue(filterStyles.minHeight)).toBe(true);
    expect(isTouchTargetValue(filterStyles.minWidth)).toBe(true);
    expect(isTouchTargetValue(logoStyles.minHeight)).toBe(true);
    expect(isTouchTargetValue(logoStyles.minWidth)).toBe(true);
  });
});
