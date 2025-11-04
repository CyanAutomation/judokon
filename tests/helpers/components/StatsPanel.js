import { vi } from "vitest";
import { StatsPanel } from "../../../src/components/StatsPanel.js";

/**
 * Create a mock StatsPanel factory for testing.
 * Uses the real StatsPanel class for realistic behavior.
 *
 * @param {object} stats - Stats object with stat values
 * @param {object} [options] - Optional configuration
 * @param {string} [options.type="common"] - Card rarity or panel type
 * @param {string} [options.className] - Additional class name
 * @param {string} [options.ariaLabel="Judoka Stats"] - ARIA label
 * @returns {object} Mock stats panel with element and control methods
 */
export async function createStatsPanel(stats, options = {}) {
  // Create StatsPanel instance
  const panel = new StatsPanel(stats, options);

  // Spy for update calls
  const onUpdate = vi.fn();

  // Wrap the update method to track calls
  const originalUpdate = panel.update.bind(panel);
  panel.update = async (newStats) => {
    onUpdate(newStats);
    return originalUpdate(newStats);
  };

  // Initialize with stats
  await panel.update(stats);

  // Helper methods for testing
  const getStatElements = () => {
    return Array.from(panel.element.querySelectorAll("li"));
  };

  const getStatValue = (statKey) => {
    const statElement = Array.from(panel.element.querySelectorAll("li")).find((li) => {
      const label = li.querySelector("strong");
      return label?.dataset?.tooltipId === `stat.${statKey}`;
    });

    if (!statElement) {
      return null;
    }

    const value = statElement.querySelector("span");
    return value ? value.textContent : null;
  };

  return {
    element: panel.element,
    update: panel.update,
    getStatElements,
    getStatValue,
    onUpdate
  };
}
