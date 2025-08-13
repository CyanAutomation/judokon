import { test, expect } from "./fixtures/commonSetup.js";

/**
 * Verify stat buttons are cleared after the next round begins.
 */
test.describe.parallel("Classic battle button reset", () => {
  test("no button stays selected after next round", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator(".snackbar").filter({ hasText: "Select your move" }).waitFor();
    const timer = page.locator("header #next-round-timer");
    await timer.waitFor();
    await page.locator("#stat-buttons button[data-stat='power']").click();
    await page.locator("#next-button").click();
    await page.evaluate(() => window.skipBattlePhase?.());
    await page.locator(".snackbar").filter({ hasText: "Select your move" }).waitFor();
    await expect(page.locator("#stat-buttons .selected")).toHaveCount(0);
  });

  test("tap highlight color cleared after reset", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator(".snackbar").filter({ hasText: "Select your move" }).waitFor();
    const timer = page.locator("header #next-round-timer");
    await timer.waitFor();
    // Select a stat, then advance to the next round
    const initialBtn = page.locator("#stat-buttons button[data-stat='power']");
    await initialBtn.click();
    await page.locator("#next-button").click();
    await page.evaluate(() => window.skipBattlePhase?.());
    // Wait until the state machine reports the new round is awaiting input
    await page
      .locator("#machine-state", { hasText: "waitingForPlayerAction" })
      .waitFor({ state: "attached" });
    // Also wait for the selection prompt that signifies the next round started
    await page.locator(".snackbar").filter({ hasText: "Select your move" }).waitFor();
    // Wait for stat buttons to be fully re-enabled for the new round
    await page.locator('#stat-buttons[data-buttons-ready="true"]').waitFor();
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
