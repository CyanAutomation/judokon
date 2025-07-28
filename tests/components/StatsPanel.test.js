import { describe, it, expect } from "vitest";
import { createStatsPanel } from "../../src/components/StatsPanel.js";

describe("createStatsPanel", () => {
  it("creates DOM structure with stat values", () => {
    const panel = createStatsPanel({
      power: 5,
      speed: 6,
      technique: 7,
      kumikata: 8,
      newaza: 9
    });
    const items = panel.querySelectorAll("li.stat");
    expect(panel.classList.contains("card-stats")).toBe(true);
    expect(items).toHaveLength(5);
    expect(items[0].textContent).toContain("5");
    expect(items[4].textContent).toContain("9");
    expect(panel).toHaveAttribute("aria-label", "Judoka Stats");
  });

  it("applies custom type and class", () => {
    const panel = createStatsPanel(
      { power: 1, speed: 2 },
      { type: "legendary", className: "extra", ariaLabel: "Player Stats" }
    );
    expect(panel.classList.contains("legendary")).toBe(true);
    expect(panel.classList.contains("extra")).toBe(true);
    expect(panel).toHaveAttribute("aria-label", "Player Stats");
  });

  it("throws when stats is missing", () => {
    expect(() => createStatsPanel(null)).toThrowError("Stats object is required");
  });
});
