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
});
