// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import postcss from "postcss";

function hasEllipsisRule(css) {
  const root = postcss.parse(css);
  let found = false;
  root.walkAtRules("media", (at) => {
    if (/max-width:\s*300px/.test(at.params)) {
      at.walkRules((rule) => {
        if (rule.selector.includes("#round-message") || rule.selector.includes("#score-display")) {
          const overflow = rule.nodes.find((n) => n.prop === "text-overflow");
          const whiteSpace = rule.nodes.find((n) => n.prop === "white-space");
          if (overflow && /ellipsis/.test(overflow.value) && whiteSpace) {
            found = true;
          }
        }
      });
    }
  });
  return found;
}

describe("battle.css responsive truncation", () => {
  it("applies ellipsis to message and score on tiny screens", () => {
    const css = readFileSync("src/styles/battle.css", "utf8");
    expect(hasEllipsisRule(css)).toBe(true);
  });
});
