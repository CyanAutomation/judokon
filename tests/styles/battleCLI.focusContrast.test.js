import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Focus visuals for Battle CLI: ensure adequate contrast for accessibility.
// Colors are sourced from battleCLI.css and resolved against CSS variables.

const NON_TEXT_AA_MIN = 3.0; // WCAG AA non-text (UI component focus indicator)
const TEXT_AA_MIN = 4.5; // WCAG AA text
const CLI_CSS_PATH = resolve("src/pages/battleCLI.css");

const escapeRegex = (value) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const getRuleBlock = (css, selector, startIndex = 0) => {
  const pattern = new RegExp(`${escapeRegex(selector)}[^\\{]*\\{`, "g");
  pattern.lastIndex = startIndex;
  const match = pattern.exec(css);
  if (!match) {
    return null;
  }

  const blockStart = css.indexOf("{", match.index) + 1;
  let depth = 1;
  for (let index = blockStart; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          block: css.slice(blockStart, index),
          endIndex: index + 1
        };
      }
    }
  }

  return null;
};

const getLastDeclaration = (css, selector, property) => {
  let searchIndex = 0;
  let declaration = null;
  let match = getRuleBlock(css, selector, searchIndex);

  while (match) {
    const pattern = new RegExp(`${escapeRegex(property)}\\s*:\\s*([^;]+);`, "i");
    const valueMatch = pattern.exec(match.block);
    if (valueMatch) {
      declaration = valueMatch[1].trim();
    }
    searchIndex = match.endIndex;
    match = getRuleBlock(css, selector, searchIndex);
  }

  return declaration;
};

const parseVariables = (css) => {
  const rootBlock = getRuleBlock(css, ":root");
  if (!rootBlock) {
    return {};
  }

  const variables = {};
  const pattern = /--[\w-]+\s*:\s*[^;]+;/g;
  const matches = rootBlock.block.match(pattern) ?? [];
  for (const entry of matches) {
    const [name, ...valueParts] = entry.split(":");
    variables[name.trim()] = valueParts.join(":").replace(/;$/, "").trim();
  }

  return variables;
};

const resolveVarTokens = (value, variables) =>
  value.replace(/var\((--[\w-]+)(?:,\s*([^\)]+))?\)/g, (_match, name, fallback) => {
    if (variables[name]) {
      return variables[name];
    }
    return fallback ? fallback.trim() : _match;
  });

const parseHexColor = (value) => {
  const trimmed = value.replace("#", "").trim();
  if (trimmed.length === 3) {
    const [r, g, b] = trimmed.split("").map((char) => char + char);
    return {
      r: parseInt(r, 16),
      g: parseInt(g, 16),
      b: parseInt(b, 16),
      a: 1
    };
  }
  if (trimmed.length === 6) {
    return {
      r: parseInt(trimmed.slice(0, 2), 16),
      g: parseInt(trimmed.slice(2, 4), 16),
      b: parseInt(trimmed.slice(4, 6), 16),
      a: 1
    };
  }

  return null;
};

const parseRgbColor = (value) => {
  const match = /rgba?\(([^)]+)\)/i.exec(value);
  if (!match) {
    return null;
  }

  const parts = match[1].split(",").map((part) => part.trim());
  const [r, g, b] = parts.slice(0, 3).map((part) => Number(part));
  const a = parts[3] === undefined ? 1 : Number(parts[3]);
  return {
    r,
    g,
    b,
    a
  };
};

const parseColorToken = (token) => parseHexColor(token) ?? parseRgbColor(token);

const extractColorTokens = (value) => {
  const matches = value.match(/#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^\)]+\)/g);
  return matches ?? [];
};

const compositeColor = (foreground, background) => {
  const alpha = foreground.a;
  const mix = (channel) => Math.round(channel * alpha + background[channel] * (1 - alpha));
  return {
    r: mix(foreground.r),
    g: mix(foreground.g),
    b: mix(foreground.b),
    a: 1
  };
};

const toHex = ({ r, g, b }) =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

const resolveColorValue = (value, variables, background) => {
  if (!value) {
    throw new Error("Missing color value in battleCLI.css");
  }

  const resolved = resolveVarTokens(value, variables);
  const tokens = extractColorTokens(resolved);
  if (tokens.length === 0) {
    throw new Error(`Unable to parse color from: ${value}`);
  }

  let color = parseColorToken(tokens[tokens.length - 1]);
  if (!color) {
    throw new Error(`Unable to parse color token from: ${value}`);
  }
  if (color.a < 1 && background) {
    color = compositeColor(color, background);
  }

  return toHex(color);
};

const resolveInheritedColor = (value, fallback) => {
  if (!value || value === "inherit" || value === "currentColor") {
    return fallback;
  }
  return value;
};

const css = readFileSync(CLI_CSS_PATH, "utf8");
const variables = parseVariables(css);
const cliRootBackground = resolveColorValue(
  getLastDeclaration(css, "#cli-root", "background"),
  variables
);
const cliRootText = resolveColorValue(
  getLastDeclaration(css, "#cli-root", "color"),
  variables
);

const focusOutline = getLastDeclaration(css, "button:focus", "outline");
const focusBoxShadow = getLastDeclaration(css, "button:focus", "box-shadow");
const focusRingSource = focusOutline ?? focusBoxShadow;
const focusRingColor = resolveColorValue(focusRingSource, variables, {
  r: parseInt(cliRootBackground.slice(1, 3), 16),
  g: parseInt(cliRootBackground.slice(3, 5), 16),
  b: parseInt(cliRootBackground.slice(5, 7), 16),
  a: 1
});

const statFocusBackground = resolveColorValue(
  getLastDeclaration(css, ".cli-stat:focus", "background"),
  variables
);
const statTextDecl = resolveInheritedColor(
  getLastDeclaration(css, ".cli-stat", "color"),
  cliRootText
);
const statTextColor = resolveColorValue(statTextDecl, variables);

const focusContrastCases = [
  {
    name: "focus ring vs page background",
    fg: focusRingColor,
    bg: cliRootBackground,
    min: NON_TEXT_AA_MIN
  },
  {
    name: "focused stat background vs text",
    fg: statTextColor,
    bg: statFocusBackground,
    min: TEXT_AA_MIN
  }
];

describe("battleCLI focus contrast", () => {
  for (const { name, fg, bg, min } of focusContrastCases) {
    it(`${name} (>= ${min})`, () => {
      const ratio = hex(bg, fg);
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  }
});
