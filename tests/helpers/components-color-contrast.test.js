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

function getComponentColors(vars) {
  const css = readFileSync(resolve("src/styles/components.css"), "utf8");
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

  it.each(bgTests)("%s bg vs --color-text-inverted", (_, bg) => {
    const ratio = hex(bg, vars["--color-text-inverted"]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
