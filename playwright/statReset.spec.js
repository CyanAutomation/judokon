import { test, expect } from "./fixtures/commonSetup.js";

/**
 * Verify stat buttons are cleared after the next round begins.
 */
test.describe("Classic battle button reset", () => {
  test("no button stays selected after countdown", async ({ page }) => {
    await page.addInitScript(() => {
      window.startCountdownOverride = (_s, cb) => cb();
    });
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator("#stat-buttons button[data-stat='power']").click();
    await page.waitForFunction(() => {
      const msg = document.getElementById("round-message");
      return msg && msg.textContent.includes("Select your move");
    });
    await expect(page.locator("#stat-buttons .selected")).toHaveCount(0);
  });

  test("tap highlight color cleared after reset", async ({ page }) => {
    await page.addInitScript(() => {
      window.startCountdownOverride = (_s, cb) => cb();
    });
    await page.goto("/src/pages/battleJudoka.html");
    const btn = page.locator("#stat-buttons button[data-stat='power']");
    await btn.click();
    await page.waitForFunction(() => {
      const msg = document.getElementById("round-message");
      return msg && msg.textContent.includes("Select your move");
    });
    const highlight = await btn.evaluate((el) => getComputedStyle(el).webkitTapHighlightColor);
    expect(highlight).toBe("rgba(0, 0, 0, 0)");
  });
});
