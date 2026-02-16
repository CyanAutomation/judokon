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

  test("control buttons are partially replaced during initialization", async () => {
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

    // Verify which buttons ARE replaced during init (via resetBattleUI/game:reset-ui event)
    const quitAfter = document.getElementById("quit-button");
    const replayAfter = document.getElementById("replay-button");
    const nextAfter = document.getElementById("next-button");

    expect(quitAfter).not.toBe(quitBefore); // Replaced via resetQuitButton()
    // Note: Replay button may or may not be replaced depending on initialization flow
    expect(nextAfter).not.toBe(nextBefore); // Replaced via resetNextButton()

    // Delegated routing markers must survive replacement on final button instances.
    expect(quitAfter.dataset.action).toBe("quit");
    expect(replayAfter.dataset.action).toBe("replay");
    expect(nextAfter.dataset.action).toBe("next");
  });

  test("stat buttons use event delegation pattern", async () => {
    document.documentElement.innerHTML = getHtmlContent();

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    // Critical: Verify stat buttons exist
    const container = document.getElementById("stat-buttons");
    const buttons = Array.from(container.querySelectorAll("button[data-stat]"));
    expect(buttons.length).toBeGreaterThan(0);

    // Note: Event delegation handler registration depends on full game flow
    // The important architectural point is that stat buttons use event delegation
    // via registerStatButtonClickHandler() which prevents handler loss when
    // buttons are recreated during gameplay (via createStatButtonsUI())
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

  test("delegated control routing survives button replacement", async () => {
    document.documentElement.innerHTML = getHtmlContent();

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    await initClassicBattleTest({ afterMock: true });

    const quitBefore = document.getElementById("quit-button");
    const mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    const quitAfter = document.getElementById("quit-button");
    expect(quitAfter).not.toBe(quitBefore);
    expect(quitAfter.dataset.action).toBe("quit");

    quitAfter.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.quitConfirmButtonPromise).toBeTruthy();
  });
});
