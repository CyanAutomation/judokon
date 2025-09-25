import { describe, it, expect, afterEach, vi } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI timer consolidation", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupBattleCLI();
    vi.resetModules();
  });

  it("only updates cli-countdown timer in CLI mode, not shared scoreboard timer", async () => {
    const mod = await loadBattleCLI();
    await mod.init();

    const cliCountdown = document.getElementById("cli-countdown");
    const sharedTimer = document.getElementById("next-round-timer");

    expect(cliCountdown).toBeTruthy();
    expect(sharedTimer?.textContent).toBe("");

    const scoreboardModule = await import("../../src/components/Scoreboard.js");
    const updateTimerSpy = vi.spyOn(scoreboardModule, "updateTimer");

    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    const dispose = initBattleScoreboardAdapter();

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("round.timer.tick", { remainingMs: 5000 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(updateTimerSpy).not.toHaveBeenCalled();
    expect(sharedTimer?.textContent).toBe("");

    dispose();
  });

  it("shared scoreboard timer updates work in non-CLI mode", async () => {
    const mod = await loadBattleCLI();
    await mod.init();

    const cliCountdown = document.getElementById("cli-countdown");
    expect(cliCountdown).toBeTruthy();
    cliCountdown?.remove();

    const sharedTimer = document.getElementById("next-round-timer");
    expect(sharedTimer).toBeTruthy();

    const scoreboardModule = await import("../../src/components/Scoreboard.js");
    const updateTimerSpy = vi.spyOn(scoreboardModule, "updateTimer");

    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    const dispose = initBattleScoreboardAdapter();

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("round.timer.tick", { remainingMs: 3000 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(updateTimerSpy).toHaveBeenCalledWith(3);
    expect(sharedTimer?.textContent?.trim()).toBe("Time Left: 3s");

    dispose();
  });
});
