// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { hex } from "wcag-contrast";
import { parseCssVariables } from "../../src/helpers/cssVariableParser.js";

function readCss(file) {
  return readFileSync(resolve(file), "utf8");
}

function resolveColor(value, vars) {
  const varMatch = value.match(/var\((--[^)]+)\)/);
  if (varMatch) {
    return vars[varMatch[1]];
  }
  return value;
}

function readComponentsCss() {
  const base = readCss("src/styles/components.css");
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
    "common card": /\.judoka-card\.common\s*{[^}]*--card-bg-color:\s*([^;]+);/,
    "epic card": /\.judoka-card\.epic\s*{[^}]*--card-bg-color:\s*([^;]+);/,
    "legendary card": /\.judoka-card\.legendary\s*{[^}]*--card-bg-color:\s*([^;]+);/,
    "top navbar": /\.top-navbar\s*{[^}]*background-color:\s*([^;]+);/
  };
  for (const [key, regex] of Object.entries(patterns)) {
    const match = css.match(regex);
    if (match) {
      colors[key] = resolveColor(match[1].trim(), vars);
    }
  }
  return colors;
}

describe("css color contrast", () => {
  const vars = parseCssVariables(readCss("src/styles/base.css"));
  const componentColors = getComponentColors(vars);

  const basePairs = [
    ["--button-bg vs --button-text-color", vars["--button-bg"], vars["--button-text-color"]],
    [
      "--button-hover-bg vs --button-text-color",
      vars["--button-hover-bg"],
      vars["--button-text-color"]
    ],
    [
      "--button-active-bg vs --button-text-color",
      vars["--button-active-bg"],
      vars["--button-text-color"]
    ],
    ["--color-secondary vs --color-surface", vars["--color-secondary"], vars["--color-surface"]],
    ["--color-primary vs --color-surface", vars["--color-primary"], vars["--color-surface"]],
    ["--color-tertiary vs --color-secondary", vars["--color-tertiary"], vars["--color-secondary"]],
    ["--color-text vs --color-background", vars["--color-text"], vars["--color-background"]],
    ["--color-primary vs --color-background", vars["--color-primary"], vars["--color-background"]],
    [
      "--color-secondary vs --color-background",
      vars["--color-secondary"],
      vars["--color-background"]
    ],
    ["--color-tertiary vs --color-text", vars["--color-tertiary"], vars["--color-text"]],
    ["--color-surface vs --color-text", vars["--color-surface"], vars["--color-text"]]
  ];

  const componentPairs = Object.entries(componentColors).map(([label, bg]) => [
    `${label} bg vs --color-text-inverted`,
    bg,
    vars["--color-text-inverted"]
  ]);

  const pairs = [...basePairs, ...componentPairs].filter(([, a, b]) => a && b);

  it("all referenced colors exist", () => {
    for (const [, a, b] of pairs) {
      expect(a).toBeDefined();
      expect(b).toBeDefined();
    }
  });

  it.each(pairs)("%s should be >= 4.5", (_, a, b) => {
    const ratio = hex(a, b);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
