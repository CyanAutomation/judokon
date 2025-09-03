import { describe, it, expect, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

const baseOpts = {
  battleStats: ["speed", "strength"],
  stats: [
    { statIndex: 1, name: "Speed" },
    { statIndex: 2, name: "Strength" }
  ],
  html: '<div id="player-card"></div>'
};

describe("battleCLI stat interactions", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("adds .selected to chosen stat via key", async () => {
    const mod = await loadBattleCLI(baseOpts);
    await mod.renderStatList();
    mod.handleWaitingForPlayerActionKey("1");
    expect(document.querySelector('[data-stat-index="1"]').classList.contains("selected")).toBe(
      true
    );
  });

  it("sets data-selected-index on cli-stats", async () => {
    const mod = await loadBattleCLI(baseOpts);
    await mod.renderStatList();
    mod.handleWaitingForPlayerActionKey("2");
    expect(document.getElementById("cli-stats").dataset.selectedIndex).toBe("2");
  });

  it("shows stat values and responds to clicks", async () => {
    const mod = await loadBattleCLI(baseOpts);
    await mod.renderStatList();
    const { startRound } = await import("../../src/helpers/classicBattle/roundManager.js");
    startRound.mockResolvedValue({
      playerJudoka: { stats: { speed: 5, strength: 7 } },
      roundNumber: 1
    });
    await mod.__test.startRoundWrapper();
    document.body.dataset.battleState = "waitingForPlayerAction";
    const statEl = document.querySelector('[data-stat-index="1"]');
    expect(statEl.textContent).toBe("[1] Speed: 5");
    const hiddenVal = document.querySelector("#player-card li.stat span")?.textContent;
    expect(hiddenVal).toBe("5");
    statEl.click();
    expect(statEl.classList.contains("selected")).toBe(true);
  });
});
