// @vitest-environment node
import { describe, it, expect } from "vitest";
import { hex } from "wcag-contrast";
import { parseCssVars } from "./parseCssVars.js";

describe("meditation quote color contrast", () => {
  const vars = parseCssVars("src/styles/base.css");

  function resolveColorValue(value, stack = new Set()) {
    if (!value) return value;
    const trimmed = value.trim();
    const varMatch = trimmed.match(/^var\((--[^,\s)]+)(?:\s*,\s*([^)]+))?\)$/);
    if (!varMatch) {
      return trimmed;
    }

    const [, token, fallback] = varMatch;
    if (stack.has(token)) {
      return fallback ? resolveColorValue(fallback, new Set()) : undefined;
    }

    const resolved = vars[token];
    if (resolved) {
      stack.add(token);
      const resolvedValue = resolveColorValue(resolved, stack);
      stack.delete(token);
      return resolvedValue ?? (fallback ? resolveColorValue(fallback, stack) : undefined);
    }

    return fallback ? resolveColorValue(fallback, stack) : undefined;
  }

  const contrastPairs = [
    {
      label: "quote text vs block background",
      foreground: "--color-text-inverted",
      background: "--color-secondary",
      minimum: 4.5
    },
    {
      label: "quote secondary text vs block background",
      foreground: "--color-text",
      background: "--color-secondary",
      minimum: 3
    }
  ];

  it("quote block text contrast meets thresholds", () => {
    for (const { label, foreground, background, minimum } of contrastPairs) {
      expect(vars[foreground], `${label} foreground`).toBeDefined();
      expect(vars[background], `${label} background`).toBeDefined();
      const fgValue = resolveColorValue(vars[foreground]);
      const bgValue = resolveColorValue(vars[background]);
      const ratio = hex(bgValue, fgValue);
      expect(ratio, label).toBeGreaterThanOrEqual(minimum);
    }
  });
});
