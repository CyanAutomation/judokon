// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import postcss from "postcss";

function hasEllipsisRule(css) {
  const root = postcss.parse(css);
  const selectors = ["#round-message", "#next-round-timer", "#score-display span"];
  const found = new Set();
  root.walkAtRules("media", (at) => {
    if (/max-width:\s*320px/.test(at.params)) {
      at.walkRules((rule) => {
        selectors.forEach((sel) => {
          if (rule.selector.includes(sel)) {
            const overflow = rule.nodes.find((n) => n.prop === "text-overflow");
            const whiteSpace = rule.nodes.find((n) => n.prop === "white-space");
            if (overflow && /ellipsis/.test(overflow.value) && whiteSpace) {
              found.add(sel);
            }
          }
        });
      });
    }
  });
  return selectors.every((sel) => found.has(sel));
}

function hasWrapRule(css) {
  const root = postcss.parse(css);
  const selectors = [
    '.battle-header[data-orientation="portrait"] #round-message',
    '.battle-header[data-orientation="portrait"] #next-round-timer',
    '.battle-header[data-orientation="portrait"] #score-display'
  ];
  const found = new Set();
  root.walkRules((rule) => {
    selectors.forEach((sel) => {
      if (rule.selector.includes(sel)) {
        const wrap = rule.nodes.find((n) => n.prop === "overflow-wrap");
        const fontSize = rule.nodes.find((n) => n.prop === "font-size");
        if (wrap && /anywhere/.test(wrap.value) && fontSize && /clamp/.test(fontSize.value)) {
          found.add(sel);
        }
      }
    });
  });
  return selectors.every((sel) => found.has(sel));
}

describe("battle.css responsive truncation", () => {
  it("applies ellipsis to message, timer, and score on tiny screens", () => {
    const css = readFileSync("src/styles/battle.css", "utf8");
    expect(hasEllipsisRule(css)).toBe(true);
  });
  it("wraps and scales message, timer, and score on small screens", () => {
    const css = readFileSync("src/styles/battle.css", "utf8");
    expect(hasWrapRule(css)).toBe(true);
  });
});
