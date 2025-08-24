import { test, expect } from "./fixtures/commonSetup.js";
import {
  waitForBattleReady,
  waitForBattleState,
  waitForStatButtonsReady
} from "./fixtures/waits.js";

/**
 * Verify stat buttons are cleared after the next round begins.
 */
test.describe.parallel("Classic battle button reset", () => {
  test("no button stays selected after next round", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await waitForBattleReady(page);
    await page.evaluate(() => window.roundPromptPromise);
    await page.locator("#stat-buttons button[data-stat='power']").click();
    await page.locator("#next-button").click();
    await page.evaluate(() => window.skipBattlePhase?.());
    await page.evaluate(() => window.roundPromptPromise);
    await expect(page.locator("#stat-buttons .selected")).toHaveCount(0);
  });

  test("tap highlight color cleared after reset", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await waitForBattleReady(page);
    await page.evaluate(() => window.roundPromptPromise);
    // Select a stat, then advance to the next round
    const initialBtn = page.locator("#stat-buttons button[data-stat='power']");
    await initialBtn.click();
    await page.locator("#next-button").click();
    await page.evaluate(() => window.skipBattlePhase?.());
    // Wait until the state machine reports the new round is awaiting input
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    // Also wait for the selection prompt that signifies the next round started
    await page.evaluate(() => window.roundPromptPromise);
    // Wait for stat buttons to be fully re-enabled for the new round
    await waitForStatButtonsReady(page);
    // Re-query the button to avoid any stale handle if DOM updated
    const btn = page.locator("#stat-buttons button[data-stat='power']");
    // After round reset, ensure the element is attached before style reads
    await btn.waitFor({ state: "attached" });
    await expect(btn).toBeEnabled();
    // Read the computed WebKit tap highlight in a robust way across engines
    const highlight = await btn.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("-webkit-tap-highlight-color")
    );
    expect(highlight).toBe("rgba(0, 0, 0, 0)");
  });
});
