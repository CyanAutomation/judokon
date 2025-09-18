// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { uiTooltipManifest } from "../fixtures/uiTooltipManifest.js";

const tooltips = JSON.parse(readFileSync(resolve("src/data/tooltips.json"), "utf8"));

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

describe("tooltips.json", () => {
  it("conforms to the UI tooltip manifest", () => {
    // See docs/technical/ui-tooltips-manifest.md for the full manifest context.
    const seenIds = new Set();
    for (const entry of uiTooltipManifest) {
      const { tooltipId, source, component } = entry;

      expect(typeof tooltipId).toBe("string");
      expect(tooltipId.length).toBeGreaterThan(0);
      expect(seenIds.has(tooltipId)).toBe(false);
      seenIds.add(tooltipId);

      expect(typeof source).toBe("string");
      expect(source.length).toBeGreaterThan(0);
      expect(existsSync(resolve(source))).toBe(true);

      if (component !== undefined) {
        expect(typeof component).toBe("string");
        expect(component.length).toBeGreaterThan(0);
      }

      const tooltipValue = get(tooltips, tooltipId);
      expect(typeof tooltipValue).toBe("string");

      const trimmed = tooltipValue.trim();
      expect(trimmed.length).toBeGreaterThan(0);
      expect(/todo/i.test(trimmed)).toBe(false);

      const normalized = trimmed.replace(/\\n/g, "\n");
      expect(normalized.includes("\n")).toBe(true);

      const parts = normalized
        .split("\n")
        .map((part) => part.trim())
        .filter(Boolean);
      expect(parts.length).toBeGreaterThan(1);

      const [headline, ...bodyParts] = parts;
      expect(headline.startsWith("**")).toBe(true);
      expect(headline.endsWith("**")).toBe(true);

      const label = headline.replace(/^\*\*|\*\*$/g, "").trim();
      expect(label.length).toBeGreaterThan(0);

      const description = bodyParts.join(" ").trim();
      expect(description.length).toBeGreaterThan(0);
    }
  });
});
