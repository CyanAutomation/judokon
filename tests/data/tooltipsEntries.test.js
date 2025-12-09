// @vitest-environment node
import { describe, it, expect } from "vitest";
import tooltips from "../../src/data/tooltips.json" assert { type: "json" };
import { uiTooltipManifest } from "../fixtures/uiTooltipManifest.js";

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

describe("tooltips.json", () => {
  it("covers manifest entries with readable text", () => {
    // See design/productRequirementsDocuments/prdTooltipSystem.md#tooltip-manifest for the full manifest context.
    const seenIds = new Set();

    uiTooltipManifest.forEach(({ tooltipId }) => {
      expect(seenIds.has(tooltipId)).toBe(false);
      seenIds.add(tooltipId);

      const tooltipValue = get(tooltips, tooltipId);
      expect(typeof tooltipValue).toBe("string");

      const trimmed = tooltipValue.trim();
      expect(trimmed.length).toBeGreaterThan(0);
      expect(/todo/i.test(trimmed)).toBe(false);
    });
  });

  it("spells out filter guidance when toggling search controls", () => {
    const countryFilter = get(tooltips, "ui.countryFilter");
    const clearFilter = get(tooltips, "ui.clearFilter");

    expect(countryFilter).toContain("Country filter");
    expect(countryFilter).toContain("Toggle the panel to pick flags");
    expect(clearFilter).toContain("Clear filter");
    expect(clearFilter).toContain("Show all judoka");
  });

  it("includes explicit Escape instructions for battle flow controls", () => {
    const quitMatch = get(tooltips, "ui.quitMatch");
    const nextRound = get(tooltips, "ui.next");

    expect(quitMatch).toMatch(/Quit match/);
    expect(nextRound).toMatch(/Start the next round/);
  });
});
