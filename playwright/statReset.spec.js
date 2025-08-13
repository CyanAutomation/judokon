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
    const btn = page.locator("#stat-buttons button[data-stat='power']");
    await btn.click();
    await page.locator("#next-button").click();
    await page.evaluate(() => window.skipBattlePhase?.());
    await page.locator(".snackbar").filter({ hasText: "Select your move" }).waitFor();
    const highlight = await btn.evaluate((el) => getComputedStyle(el).webkitTapHighlightColor);
    expect(highlight).toBe("rgba(0, 0, 0, 0)");
  });
});
