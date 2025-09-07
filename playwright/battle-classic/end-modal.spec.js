import { test, expect } from "@playwright/test";

test.describe("Classic Battle end-of-match modal", () => {
  test("shows modal on match end and supports Replay", async ({ page }) => {
    await page.addInitScript(() => {
      window.__OVERRIDE_TIMERS = { roundTimer: 1 };
      window.__NEXT_ROUND_COOLDOWN_MS = 500;
    });
    await page.goto("/src/pages/battleClassic.html");
    // pointsToWin=1
    await page.evaluate(async () => {
      const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
      setPointsToWin(1);
    });
    await page.click("#round-select-2");
    await page.click("#stat-buttons button[data-stat]");
    await expect(page.locator("#match-end-modal")).toBeVisible();
    await page.click("#match-replay-button");
    await expect(page.locator("#score-display")).toContainText(/You:\s*0/);
  });
});
