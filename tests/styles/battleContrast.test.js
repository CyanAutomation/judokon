import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Contrast requirements follow WCAG AA thresholds for text (>= 4.5)
// Colors sourced from the classic battle slot design palette.
// This test is data-driven to make additions/updates straightforward.

const TEXT_AA_MIN = 4.5;
const BASE_CSS_PATH = resolve("src/styles/base.css");
const BATTLE_CSS_PATH = resolve("src/styles/battleClassic.css");

const escapeRegex = (value) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const getCssText = (path) => readFileSync(path, "utf8");

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
    variables[name.trim()] = rawValue.replace(/;$/, "").trim();
  }

  return variables;
};

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

const resolveVar = (value, variables) => {
  const varMatch = /var\((--[\w-]+)(?:,\s*([^\)]+))?\)/.exec(value);
  if (!varMatch) {
    return value.trim();
  }

  const [, name, fallback] = varMatch;
  return variables[name] ?? (fallback ? fallback.trim() : value.trim());
};

const parseMixStop = (stop) => {
  const trimmed = stop.trim();
  const match = /(.*)\s+([\d.]+%)$/.exec(trimmed);
  if (!match) {
    return { color: trimmed, weight: null };
  }
  return {
    color: match[1].trim(),
    weight: Number.parseFloat(match[2])
  };
};

const parseColor = (value, variables) => {
  const resolved = resolveVar(value, variables);
  if (resolved === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return parseHexColor(resolved) ?? parseRgbColor(resolved);
};

const mixColors = (first, second, weightFirst) => {
  const weight = weightFirst / 100;
  const weightSecond = 1 - weight;
  return {
    r: Math.round(first.r * weight + second.r * weightSecond),
    g: Math.round(first.g * weight + second.g * weightSecond),
    b: Math.round(first.b * weight + second.b * weightSecond),
    a: first.a * weight + second.a * weightSecond
  };
};

const resolveColor = (value, variables) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("color-mix(")) {
    const inner = trimmed
      .replace(/^color-mix\(in srgb,?/i, "")
      .replace(/\)$/, "")
      .trim();
    const parts = inner
      .split(/,(?![^()]*\))/)
      .map((part) => part.trim())
      .filter(Boolean);
    const firstStop = parseMixStop(parts[0]);
    const secondStop = parseMixStop(parts[1]);
    
    // Handle weight calculation according to CSS color-mix specification
    let firstWeight, secondWeight;
    if (firstStop.weight !== null && secondStop.weight !== null) {
      firstWeight = firstStop.weight;
      secondWeight = secondStop.weight;
    } else if (firstStop.weight !== null) {
      firstWeight = firstStop.weight;
      secondWeight = 100 - firstWeight;
    } else if (secondStop.weight !== null) {
      secondWeight = secondStop.weight;
      firstWeight = 100 - secondWeight;
    } else {
      firstWeight = 50;
      secondWeight = 50;
    }
    
    const firstColor = parseColor(firstStop.color, variables);
    const secondColor = parseColor(secondStop.color, variables);
    if (!firstColor || !secondColor) {
      throw new Error(`Unable to parse color-mix: ${value}`);
    }
    const mixed = mixColors(firstColor, secondColor, firstWeight);
    return `#${[mixed.r, mixed.g, mixed.b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  const parsed = parseColor(trimmed, variables);
  if (!parsed) {
    throw new Error(`Unable to parse color: ${value}`);
  }
  return `#${[parsed.r, parsed.g, parsed.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};

const buildContrastCases = () => {
  let baseCss, battleCss;
  try {
    baseCss = getCssText(BASE_CSS_PATH);
    battleCss = getCssText(BATTLE_CSS_PATH);
  } catch (error) {
    throw new Error(`Failed to read CSS files: ${error.message}. Ensure ${BASE_CSS_PATH} and ${BATTLE_CSS_PATH} exist.`);
  }
  
  const variables = parseVariables(baseCss);
  const requireDeclaration = (value, label) => {
    if (!value) {
      throw new Error(`Missing CSS declaration for ${label}`);
    }
    return value;
  };
  const textColorDeclaration =
    getLastDeclaration(battleCss, "#battle-area .player-slot", "color") ??
    variables["--color-text"];
  const textColor = resolveColor(textColorDeclaration, variables);

  const playerBackgroundDeclaration = requireDeclaration(
    getLastDeclaration(
      battleCss,
      "#battle-area .player-slot .slot-surface",
      "background-color"
    ),
    "player slot background-color"
  );
  const opponentBackgroundDeclaration = requireDeclaration(
    getLastDeclaration(
      battleCss,
      "#battle-area .opponent-slot .slot-surface",
      "background-color"
    ),
    "opponent slot background-color"
  );

  return [
    {
      name: "player slot bg vs text",
      fg: textColor,
      bg: resolveColor(playerBackgroundDeclaration, variables),
      min: TEXT_AA_MIN
    },
    {
      name: "opponent slot bg vs text",
      fg: textColor,
      bg: resolveColor(opponentBackgroundDeclaration, variables),
      min: TEXT_AA_MIN
    }
  ];
};

describe("battle slot color contrast", () => {
  const cases = buildContrastCases();

  for (const { name, fg, bg, min } of cases) {
    it(`${name} (>= ${min})`, () => {
      const ratio = hex(bg, fg);
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  }
});
