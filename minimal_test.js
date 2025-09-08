import { describe, test, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Minimal score update test", () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.innerHTML = "";
  });

  test("score updates when display.score.update event is emitted", async () => {
    // Load the HTML
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    // Initialize scoreboard
    const { setupScoreboard, updateScore } = await import("./src/helpers/setupScoreboard.js");
    setupScoreboard({ pauseTimer() {}, resumeTimer() {}, startCooldown() {} });

    // Initialize scoreboard adapter
    const { initScoreboardAdapter } = await import("./src/helpers/classicBattle/scoreboardAdapter.js");
    initScoreboardAdapter();

    // Check initial score
    const score = document.getElementById("score-display");
    console.log("Initial score:", score?.textContent);
    expect(score?.textContent).toMatch(/You:\s*0/);

    // Emit display.score.update event
    const { emitBattleEvent } = await import("./src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("display.score.update", { player: 1, opponent: 0 });

    // Check updated score
    console.log("Updated score:", score?.textContent);
    expect(score?.textContent).toMatch(/You:\s*1/);
  });

  test("battle engine updates score correctly", async () => {
    // Load the HTML
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    // Initialize scoreboard
    const { setupScoreboard } = await import("./src/helpers/setupScoreboard.js");
    setupScoreboard({ pauseTimer() {}, resumeTimer() {}, startCooldown() {} });

    // Initialize scoreboard adapter
    const { initScoreboardAdapter } = await import("./src/helpers/classicBattle/scoreboardAdapter.js");
    initScoreboardAdapter();

    // Create battle engine
    const { createBattleEngine, handleStatSelection } = await import("./src/helpers/battleEngineFacade.js");
    createBattleEngine();

    // Check initial score
    const score = document.getElementById("score-display");
    console.log("Initial score:", score?.textContent);

    // Call handleStatSelection directly (player wins with 5 vs 3)
    const result = handleStatSelection(5, 3);
    console.log("Battle result:", result);

    // Check if score was updated
    console.log("Score after battle:", score?.textContent);
    expect(score?.textContent).toMatch(/You:\s*1/);
  });
});