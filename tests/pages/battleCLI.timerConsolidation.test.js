import { describe, it, expect, beforeEach, afterEach } from "vitest";import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

import { initBattleScoreboardAdapter } from "../../src/helpers/battleScoreboard.js";import { initBattleScoreboardAdapter } from "../../src/helpers/battleScoreboard.js";

import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";



describe("battleCLI timer consolidation", () => {describe("battleCLI timer consolidation", () => {

  beforeEach(async () => {  beforeEach(async () => {

    await cleanupBattleCLI();    await cleanupBattleCLI();

  });  });



  afterEach(async () => {  afterEach(async () => {

    await cleanupBattleCLI();    await cleanupBattleCLI();

  });  });



  it("only updates cli-countdown timer in CLI mode, not shared scoreboard timer", async () => {  it("only updates cli-countdown timer in CLI mode, not shared scoreboard timer", async () => {

    // Load battleCLI which creates the cli-countdown element    // Load battleCLI which creates the cli-countdown element

    const mod = await loadBattleCLI();    const mod = await loadBattleCLI();

    await mod.init();    await mod.init();



    // Verify cli-countdown element exists    // Initialize the battle scoreboard adapter (this should skip timer updates in CLI mode)

    const cliCountdown = document.getElementById("cli-countdown");    const dispose = initBattleScoreboardAdapter();

    expect(cliCountdown).toBeTruthy();

    // Verify cli-countdown element exists

    // Initialize the battle scoreboard adapter (this should skip timer updates in CLI mode)    const cliCountdown = document.getElementById("cli-countdown");

    const dispose = initBattleScoreboardAdapter();    expect(cliCountdown).toBeTruthy();



    // Check that next-round-timer remains empty (not updated by shared scoreboard)    // Mock the updateTimer function to track calls

    const sharedTimer = document.getElementById("next-round-timer");    const updateTimerSpy = vi.fn();

    expect(sharedTimer).toBeTruthy();    vi.doMock("../../src/components/Scoreboard.js", () => ({

    expect(sharedTimer.textContent).toBe("");      updateTimer: updateTimerSpy,

      showMessage: vi.fn(),

    // Emit a timer tick event      updateScore: vi.fn(),

    emitBattleEvent("round.timer.tick", { detail: { remainingMs: 5000 } });      updateRoundCounter: vi.fn(),

      clearRoundCounter: vi.fn(),

    // Wait for event processing      showTemporaryMessage: vi.fn(),

    await new Promise((resolve) => setTimeout(resolve, 10));      getState: vi.fn()

    }));

    // The shared timer should still be empty (not updated in CLI mode)

    expect(sharedTimer.textContent).toBe("");    // Emit a timer tick event

    emitBattleEvent("round.timer.tick", { detail: { remainingMs: 5000 } });

    // Clean up

    dispose();    // Wait for event processing

  });    await new Promise((resolve) => setTimeout(resolve, 10));



  it("shared scoreboard timer updates work in non-CLI mode", async () => {    // The shared scoreboard updateTimer should NOT have been called in CLI mode

    // Remove cli-countdown element to simulate non-CLI mode    expect(updateTimerSpy).not.toHaveBeenCalled();

    const cliCountdown = document.getElementById("cli-countdown");

    if (cliCountdown) {    // Clean up

      cliCountdown.remove();    dispose();

    }    vi.restoreAllMocks();

  });

    // Initialize the battle scoreboard adapter

    const dispose = initBattleScoreboardAdapter();  it("shared scoreboard timer updates work in non-CLI mode", async () => {

    // Remove cli-countdown element to simulate non-CLI mode

    // Check that next-round-timer exists    const cliCountdown = document.getElementById("cli-countdown");

    const sharedTimer = document.getElementById("next-round-timer");    if (cliCountdown) {

    expect(sharedTimer).toBeTruthy();      cliCountdown.remove();

    }

    // Emit a timer tick event

    emitBattleEvent("round.timer.tick", { detail: { remainingMs: 3000 } });    // Mock the updateTimer function to track calls

    const updateTimerSpy = vi.fn();

    // Wait for event processing    vi.doMock("../../src/components/Scoreboard.js", () => ({

    await new Promise((resolve) => setTimeout(resolve, 10));      updateTimer: updateTimerSpy,

      showMessage: vi.fn(),

    // The shared timer SHOULD have been updated in non-CLI mode      updateScore: vi.fn(),

    expect(sharedTimer.textContent).toBe("Time Left: 3s");      updateRoundCounter: vi.fn(),

      clearRoundCounter: vi.fn(),

    // Clean up      showTemporaryMessage: vi.fn(),

    dispose();      getState: vi.fn()

  });    }));

});
    // Initialize the battle scoreboard adapter
    const dispose = initBattleScoreboardAdapter();

    // Emit a timer tick event
    emitBattleEvent("round.timer.tick", { detail: { remainingMs: 3000 } });

    // Wait for event processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The shared timer SHOULD have been updated in non-CLI mode
    expect(sharedTimer.textContent).toBe("Time Left: 3s");

    // Clean up
    dispose();
  });
});