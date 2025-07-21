// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { hex } from "wcag-contrast";
import { parseCssVariables } from "../../src/helpers/cssVariableParser.js";

function getBaseVars() {
  const css = readFileSync(resolve("src/styles/base.css"), "utf8");
  return parseCssVariables(css);
}

function resolveColor(value, vars) {
  const varMatch = value.match(/var\((--[^)]+)\)/);
  if (varMatch) {
    return vars[varMatch[1]];
  }
  return value;
}

function readComponentsCss() {
  const base = readFileSync(resolve("src/styles/components.css"), "utf8");
  let css = base;
  const importRegex = /@import\s+["'](.+?)["'];/g;
  let match;
  while ((match = importRegex.exec(base))) {
    const filePath = resolve("src/styles", match[1]);
    css += readFileSync(filePath, "utf8");
  }
  return css;
}

function getComponentColors(vars) {
  const css = readComponentsCss();
  const colors = {};
  const patterns = {
    common: /\.judoka-card\.common\s*{[^}]*--card-bg-color:\s*([^;]+);/,
    epic: /\.judoka-card\.epic\s*{[^}]*--card-bg-color:\s*([^;]+);/,
    legendary: /\.judoka-card\.legendary\s*{[^}]*--card-bg-color:\s*([^;]+);/,
    topNavbar: /\.top-navbar\s*{[^}]*background-color:\s*([^;]+);/
  };
  for (const [key, regex] of Object.entries(patterns)) {
    const match = css.match(regex);
    if (match) {
      colors[key] = resolveColor(match[1].trim(), vars);
    }
  }
  return colors;
}

describe("components.css color contrast", () => {
  const vars = getBaseVars();
  const colors = getComponentColors(vars);
  const bgTests = [
    ["common card", colors.common],
    ["epic card", colors.epic],
    ["legendary card", colors.legendary],
    ["top navbar", colors.topNavbar]
  ].filter(([, c]) => c);

  it("all referenced CSS variables and extracted colors exist", () => {
    expect(vars["--color-text-inverted"]).toBeDefined();
    for (const [, bg] of bgTests) {
      expect(bg).toBeDefined();
    }
  });

  it.each(bgTests)("%s bg vs --color-text-inverted", (_, bg) => {
    expect(vars["--color-text-inverted"]).toBeDefined();
    expect(bg).toBeDefined();
    const ratio = hex(bg, vars["--color-text-inverted"]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
