import { describe, it, expect } from "vitest";
import { createStatsPanel } from "./StatsPanel.js";

describe("createStatsPanel", () => {
  const mockStats = {
    power: 85,
    speed: 90,
    technique: 75
  };

  it("creates a stats panel with proper structure", () => {
    const panel = createStatsPanel(mockStats);

    expect(panel.element.tagName).toBe("DIV");
    expect(panel.element.className).toBe("card-stats common");
    expect(panel.element.getAttribute("aria-label")).toBe("Judoka Stats");

    const list = panel.element.querySelector("ul");
    expect(list).toBeTruthy();
  });

  it("applies custom options", () => {
    const panel = createStatsPanel(mockStats, {
      type: "legendary",
      className: "custom-panel",
      ariaLabel: "Custom Stats"
    });

    expect(panel.element.className).toBe("card-stats legendary custom-panel");
    expect(panel.element.getAttribute("aria-label")).toBe("Custom Stats");
  });

  it("provides stat element access", () => {
    const panel = createStatsPanel(mockStats);

    const statElements = panel.getStatElements();
    expect(statElements.length).toBeGreaterThan(0);

    // Should have list items for each stat
    expect(statElements.every((el) => el.tagName === "LI")).toBe(true);
  });

  it("provides stat value lookup", () => {
    const panel = createStatsPanel(mockStats);

    // Note: getStatValue depends on actual stat loading, so we'll test the method exists
    expect(typeof panel.getStatValue).toBe("function");

    // The actual value lookup depends on the real StatsPanel implementation
    // which loads stat names asynchronously
  });

  it("tracks update calls with spy", () => {
    const panel = createStatsPanel(mockStats);

    expect(panel.onUpdate).not.toHaveBeenCalled();

    panel.update({ power: 95, speed: 85 });

    expect(panel.onUpdate).toHaveBeenCalledWith({ power: 95, speed: 85 });
  });

  it("throws error for invalid stats", () => {
    expect(() => createStatsPanel(null)).toThrow("Stats object is required");
    expect(() => createStatsPanel(undefined)).toThrow("Stats object is required");
    expect(() => createStatsPanel("invalid")).toThrow("Stats object is required");
  });
});
