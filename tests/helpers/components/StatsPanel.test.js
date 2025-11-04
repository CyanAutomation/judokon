import { describe, it, expect } from "vitest";
import { createStatsPanel } from "./StatsPanel.js";

describe("createStatsPanel", () => {
  const mockStats = {
    power: 85,
    speed: 90,
    technique: 75
  };
  it("creates a stats panel with proper structure", async () => {
    const panel = await createStatsPanel(mockStats);

    expect(panel.element.tagName).toBe("DIV");
    expect(panel.element.className).toBe("card-stats common");
    expect(panel.element.getAttribute("aria-label")).toBe("Judoka Stats");

    const list = panel.element.querySelector("ul");
    expect(list).toBeTruthy();
  });

  it("applies custom options", async () => {
    const panel = await createStatsPanel(mockStats, {
      type: "legendary",
      className: "custom-panel",
      ariaLabel: "Custom Stats"
    });

    expect(panel.element.className).toBe("card-stats legendary custom-panel");
    expect(panel.element.getAttribute("aria-label")).toBe("Custom Stats");
  });

  it("provides stat element access", async () => {
    const panel = await createStatsPanel(mockStats);

    const statElements = panel.getStatElements();
    expect(statElements.length).toBeGreaterThan(0);

    // Should have list items for each stat
    expect(statElements.every((el) => el.tagName === "LI")).toBe(true);
  });

  it("provides stat value lookup", async () => {
    const deterministicStats = {
      power: 101,
      speed: 82,
      technique: 73,
      kumikata: 64,
      newaza: 55
    };

    const panel = await createStatsPanel(deterministicStats);

    const statElements = panel.getStatElements();

    for (const [key, value] of Object.entries(deterministicStats)) {
      const statElement = statElements.find((element) => {
        const strong = element.querySelector("strong");
        return strong?.dataset?.tooltipId === `stat.${key}`;
      });

      expect(statElement).toBeTruthy();

      const label = statElement?.querySelector("strong")?.textContent?.trim() ?? "";
      const renderedValue = statElement?.querySelector("span")?.textContent?.trim() ?? "";

      expect(renderedValue).toBe(String(value));
      expect(panel.getStatValue(label)).toBe(renderedValue);
    }
  });

  it("tracks update calls with spy", async () => {
    const panel = await createStatsPanel(mockStats);

    expect(panel.onUpdate).toHaveBeenCalledTimes(1); // Initial call

    await panel.update({ power: 95, speed: 85 });

    expect(panel.onUpdate).toHaveBeenCalledTimes(2);
    expect(panel.onUpdate).toHaveBeenLastCalledWith({ power: 95, speed: 85 });
  });

  it("throws error for invalid stats", async () => {
    // Note: The error is thrown during async update, not construction
    await expect(createStatsPanel(null)).rejects.toThrow("Stats object is required");
    await expect(createStatsPanel(undefined)).rejects.toThrow("Stats object is required");
    await expect(createStatsPanel("invalid")).rejects.toThrow("Stats object is required");
  });
});
