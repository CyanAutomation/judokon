import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI init helpers", () => {
  beforeEach(() => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(async () => {
    await cleanupBattleCLI();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("emits startClicked when start button clicked", async () => {
    const mod = await loadBattleCLI({
      stats: [{ statIndex: 1, name: "Speed" }]
    });
    await mod.init();
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitter = battleEvents.getBattleEventTarget?.();
    if (!emitter) {
      throw new Error("Battle event emitter unavailable");
    }
    const startClicked = new Promise((resolve) =>
      emitter.addEventListener("startClicked", resolve, { once: true })
    );
    expect(battleEvents.emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
    const startBtn = document.getElementById("start-match-button");
    if (!startBtn) {
      throw new Error("Start button was not rendered");
    }
    startBtn.click();
    await startClicked;
    expect(battleEvents.emitBattleEvent).toHaveBeenCalledWith("startClicked");
  });

  it("renders stats list", async () => {
    const mod = await loadBattleCLI({
      stats: [{ statIndex: 1, name: "Speed" }]
    });
    await mod.init();
    const stats = await mod.loadStatDefs();
    expect(stats).toEqual(expect.arrayContaining([{ statIndex: 1, name: "Speed" }]));
    const rows = mod.buildStatRows(stats);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.textContent?.includes("Speed"))).toBe(true);
  });
});
