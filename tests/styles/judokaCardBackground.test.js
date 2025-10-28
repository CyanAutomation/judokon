// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import postcss from "postcss";

/**
 * Locate the PostCSS rule for the provided selector.
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

describe("judoka card background", () => {
  const cardCss = readFileSync("src/styles/card.css", "utf8");

  it("references the card background asset from the correct relative path", () => {
    const rule = getRule(cardCss, ".judoka-card::before");
    expect(rule).toBeTruthy();
    const backgroundImage = rule.nodes.find((node) => node.prop === "background-image")?.value;
    expect(backgroundImage).toBe('url("../assets/cardBacks/cardBack-2.png")');
  });
});
