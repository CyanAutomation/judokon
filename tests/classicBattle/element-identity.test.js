// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";

// Defer reading HTML file until after jsdom is setup
let htmlContent;
function getHtmlContent() {
  if (!htmlContent) {
    htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return htmlContent;
}

describe("Classic Battle element identity preservation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("control buttons are replaced during initialization (expected behavior)", async () => {
    document.documentElement.innerHTML = getHtmlContent();

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    // Capture all control buttons before init
    const quitBefore = document.getElementById("quit-button");
    const replayBefore = document.getElementById("replay-button");
    const nextBefore = document.getElementById("next-button");

    expect(quitBefore).toBeTruthy();
    expect(replayBefore).toBeTruthy();
    expect(nextBefore).toBeTruthy();

    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    // Verify buttons ARE replaced during init (via resetBattleUI/game:reset-ui event)
    const quitAfter = document.getElementById("quit-button");
    const replayAfter = document.getElementById("replay-button");
    const nextAfter = document.getElementById("next-button");

    expect(quitAfter).not.toBe(quitBefore); // Replaced via resetQuitButton()
    expect(replayAfter).not.toBe(replayBefore); // Replaced indirectly
    expect(nextAfter).not.toBe(nextBefore); // Replaced via resetNextButton()

    // Critical: Verify handlers were attached to FINAL instances (after replacement)
    // This validates the fix - wireControlButtons() runs AFTER initializeMatchStart()
    expect(quitAfter.__controlBound).toBe(true);
    expect(replayAfter.__controlBound).toBe(true);
    expect(nextAfter.__controlBound).toBe(true);
  });

  test("stat buttons are replaced during initialization (expected behavior)", async () => {
    document.documentElement.innerHTML = getHtmlContent();

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const container = document.getElementById("stat-buttons");
    const buttonsBefore = Array.from(container.querySelectorAll("button[data-stat]"));

    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    const buttonsAfter = Array.from(container.querySelectorAll("button[data-stat]"));

    // Stat buttons ARE replaced - this is expected behavior (createStatButtonsUI clears container)
    expect(buttonsBefore.length).toBeGreaterThan(0);
    expect(buttonsAfter.length).toBeGreaterThan(0);

    // Individual button instances should differ
    if (buttonsBefore[0] && buttonsAfter[0]) {
      expect(buttonsAfter[0]).not.toBe(buttonsBefore[0]);
    }

    // Critical: Handlers should be attached to new instances via registerStatButtonClickHandler
    // Note: Stat buttons use event delegation on container, not individual __statButtonBound markers
    const statContainer = document.getElementById("stat-buttons");
    expect(statContainer.__statButtonClickHandler).toBe(true);
  });

  test("score display container maintains identity through initialization", async () => {
    document.documentElement.innerHTML = getHtmlContent();

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const scoreDisplayBefore = document.getElementById("score-display");
    expect(scoreDisplayBefore).toBeTruthy();

    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    const scoreDisplayAfter = document.getElementById("score-display");

    // Score display container should be same instance (innerHTML modified, not replaced)
    expect(scoreDisplayAfter).toBe(scoreDisplayBefore);
  });

  test("handler attachment timing prevents lost event handlers", async () => {
    document.documentElement.innerHTML = getHtmlContent();

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    // After init completes, all control buttons should have handlers
    const quit = document.getElementById("quit-button");
    const replay = document.getElementById("replay-button");
    const next = document.getElementById("next-button");

    expect(quit.__controlBound).toBe(true);
    expect(replay.__controlBound).toBe(true);
    expect(next.__controlBound).toBe(true);

    // Verify handlers are actually functional (not just markers)
    // Click should create the expected promise/modal
    quit.click();

    // Wait for handler to execute
    await new Promise((resolve) => setTimeout(resolve, 0));

    // If handler is attached correctly, promise should be created
    expect(window.quitConfirmButtonPromise).toBeTruthy();
  });
});
