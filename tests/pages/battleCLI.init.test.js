import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI init helpers", () => {
  beforeEach(() => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("invokes init helpers", async () => {
    const mod = await loadBattleCLI({ stats: [{ statIndex: 1, name: "Speed" }] });
    await mod.__test.init();
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    const { setPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
    const startBtn = document.getElementById("start-match-button");
    expect(startBtn).toBeTruthy();
    startBtn?.click();
    expect(emitBattleEvent).toHaveBeenCalledWith("startClicked");
    expect(document.getElementById("cli-stats").children.length).toBeGreaterThan(0);
    expect(setPointsToWin).toHaveBeenCalledWith(5);
  });
});
