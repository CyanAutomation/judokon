import { describe, it, expect } from "vitest";
import { StatsPanel, createStatsPanel } from "../../src/components/StatsPanel.js";

vi.mock("../../src/helpers/stats.js", () => ({
  loadStatNames: () =>
    Promise.resolve([
      { name: "Alpha" },
      { name: "Beta" },
      { name: "Gamma" },
      { name: "Delta" },
      { name: "Epsilon" }
    ])
}));

describe("createStatsPanel", () => {
  it("creates DOM structure with stat values", async () => {
    const panel = await createStatsPanel({
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
    const labels = panel.querySelectorAll("li.stat > strong");
    const texts = Array.from(labels).map((l) => l.textContent);
    expect(texts).toEqual(["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]);
    expect(labels[0]).toHaveAttribute("data-tooltip-id", "stat.power");
    expect(labels[1]).toHaveAttribute("data-tooltip-id", "stat.speed");
    expect(labels[2]).toHaveAttribute("data-tooltip-id", "stat.technique");
    expect(labels[3]).toHaveAttribute("data-tooltip-id", "stat.kumikata");
    expect(labels[4]).toHaveAttribute("data-tooltip-id", "stat.newaza");
  });

  it("applies custom type and class", async () => {
    const panel = await createStatsPanel(
      { power: 1, speed: 2 },
      { type: "legendary", className: "extra", ariaLabel: "Player Stats" }
    );
    expect(panel.classList.contains("legendary")).toBe(true);
    expect(panel.classList.contains("extra")).toBe(true);
    expect(panel).toHaveAttribute("aria-label", "Player Stats");
  });

  it("throws when stats is missing", async () => {
    await expect(createStatsPanel(null)).rejects.toThrowError("Stats object is required");
  });
});

describe("StatsPanel", () => {
  it("updates stat values", async () => {
    const panel = new StatsPanel({ power: 1 });
    await panel.update();
    let items = panel.element.querySelectorAll("li.stat");
    expect(items[0].textContent).toContain("1");
    await panel.update({ power: 9 });
    items = panel.element.querySelectorAll("li.stat");
    expect(items[0].textContent).toContain("9");
  });
});
