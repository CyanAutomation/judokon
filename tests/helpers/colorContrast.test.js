// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { hex } from "wcag-contrast";
import { JSDOM } from "jsdom";
import postcss from "postcss";
import { JudokaCard } from "../../src/components/JudokaCard.js";
import { parseCssVars } from "./parseCssVars.js";

function readCss(file) {
  return readFileSync(resolve(file), "utf8");
}

function resolveColorValue(value, vars, stack = new Set()) {
  if (!value) return value;
  const trimmed = value.trim();
  const varMatch = trimmed.match(/^var\((--[^,\s)]+)(?:\s*,\s*([^)]+))?\)$/);
  if (!varMatch) {
    return trimmed;
  }

  const [, token, fallback] = varMatch;
  if (stack.has(token)) {
    console.warn(`Circular reference detected for CSS variable: ${token}`);
    return fallback ? resolveColorValue(fallback, vars, new Set()) : undefined;
  }

  const resolved = vars[token];
  if (resolved) {
    stack.add(token);
    const resolvedValue = resolveColorValue(resolved, vars, stack);
    stack.delete(token);
    return resolvedValue ?? (fallback ? resolveColorValue(fallback, vars, stack) : undefined);
  }

  return fallback ? resolveColorValue(fallback, vars, stack) : undefined;
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

function parseComponentStyles(vars) {
  const css = readComponentsCss();
  const root = postcss.parse(css);
  const componentVars = {};
  const colors = {};
  const targets = [
    { label: "common card", selector: ".judoka-card.common", prop: "--card-bg-color" },
    { label: "epic card", selector: ".judoka-card.epic", prop: "--card-bg-color" },
    { label: "legendary card", selector: ".judoka-card.legendary", prop: "--card-bg-color" },
    { label: "top navbar", selector: ".top-navbar", prop: "background-color" }
  ];

  root.walkRules((rule) => {
  const targetMap = new Map(targets.map(t => [t.selector, t]));
  
  root.walkRules((rule) => {
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith("--")) {
        componentVars[decl.prop] = decl.value.trim();
      }
    });

    const selectors = rule.selectors ?? [rule.selector];
    for (const selector of selectors) {
      const target = targetMap.get(selector.trim());
      if (target) {
        rule.walkDecls(target.prop, (decl) => {
          colors[target.label] = decl.value.trim();
        });
      }
    }
  });

  const mergedVars = { ...vars, ...componentVars };
  const resolvedColors = Object.fromEntries(
    Object.entries(colors).map(([label, value]) => [label, resolveColorValue(value, mergedVars)])
  );

  return { componentColors: resolvedColors, componentVars };
}

describe("css color contrast", () => {
  const baseVars = parseCssVars("src/styles/base.css");
  const { componentColors, componentVars } = parseComponentStyles(baseVars);
  const vars = { ...baseVars, ...componentVars };

  const basePairs = [
    [
      "--button-bg vs --button-text-color",
      resolveColorValue(vars["--button-bg"], vars),
      resolveColorValue(vars["--button-text-color"], vars)
    ],
    [
      "--button-hover-bg vs --button-text-color",
      resolveColorValue(vars["--button-hover-bg"], vars),
      resolveColorValue(vars["--button-text-color"], vars)
    ],
    [
      "--button-active-bg vs --button-text-color",
      resolveColorValue(vars["--button-active-bg"], vars),
      resolveColorValue(vars["--button-text-color"], vars)
    ],
    [
      "--color-secondary vs --color-surface",
      resolveColorValue(vars["--color-secondary"], vars),
      resolveColorValue(vars["--color-surface"], vars)
    ],
    [
      "--color-primary vs --color-surface",
      resolveColorValue(vars["--color-primary"], vars),
      resolveColorValue(vars["--color-surface"], vars)
    ],
    [
      "--color-tertiary vs --color-secondary",
      resolveColorValue(vars["--color-tertiary"], vars),
      resolveColorValue(vars["--color-secondary"], vars)
    ],
    [
      "--color-text vs --color-background",
      resolveColorValue(vars["--color-text"], vars),
      resolveColorValue(vars["--color-background"], vars)
    ],
    [
      "--color-primary vs --color-background",
      resolveColorValue(vars["--color-primary"], vars),
      resolveColorValue(vars["--color-background"], vars)
    ],
    [
      "--color-secondary vs --color-background",
      resolveColorValue(vars["--color-secondary"], vars),
      resolveColorValue(vars["--color-background"], vars)
    ],
    [
      "--color-tertiary vs --color-text",
      resolveColorValue(vars["--color-tertiary"], vars),
      resolveColorValue(vars["--color-text"], vars)
    ],
    [
      "--color-surface vs --color-text",
      resolveColorValue(vars["--color-surface"], vars),
      resolveColorValue(vars["--color-text"], vars)
    ]
  ];

  const componentPairs = Object.entries(componentColors).map(([label, bg]) => [
    `${label} bg vs --color-text-inverted`,
    bg,
    resolveColorValue(vars["--color-text-inverted"], vars)
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

  it("renders critical components used by contrast selectors", async () => {
    const navbarHtml = readCss("src/pages/createJudoka.html");
    const navbarDom = new JSDOM(navbarHtml);
    expect(navbarDom.window.document.querySelector(".top-navbar")).toBeTruthy();

    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const previousNode = globalThis.Node;

    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.Node = dom.window.Node;

    try {
      const sampleJudoka = {
        id: 5,
        firstname: "Rin",
        surname: "Kato",
        country: "Japan",
        countryCode: "jp",
        stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 },
        weightClass: "-60",
        signatureMoveId: 0,
        rarity: "Common",
        gender: "female"
      };
      const gokyoLookup = { 0: { id: 0, name: "Seoi-nage" } };
      const card = new JudokaCard(sampleJudoka, gokyoLookup);
      const rendered = await card.render();
      expect(rendered.querySelector(".judoka-card")).toBeTruthy();
      expect(rendered.querySelector(".judoka-card.common")).toBeTruthy();
    } finally {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
      globalThis.Node = previousNode;
    }
  });
});
