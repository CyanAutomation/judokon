import { test, expect } from "@playwright/test";

test.describe("Classic Battle replay", () => {
  test("Replay resets scoreboard after match end", async ({ page }) => {
    await page.addInitScript(() => {
      window.__OVERRIDE_TIMERS = { roundTimer: 1 };
      window.__NEXT_ROUND_COOLDOWN_MS = 500;
    });
    await page.goto("/src/pages/battleClassic.html");

    // Wait for initialization to complete before calling setPointsToWin
    await page.waitForFunction(() => window.__initCalled === true, { timeout: 5000 });

    // Initialize and set points to win = 1
    await page.evaluate(async () => {
      const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
      setPointsToWin(1);
    });

    // Start match and click first stat to end quickly
    await page.click("#round-select-2");
    await page.waitForSelector("#stat-buttons button[data-stat]");
    await page.click("#stat-buttons button[data-stat]");
    await page.waitForTimeout(200);
    await expect(page.locator("#score-display")).toContainText(/You:\s*1/);

    // Click Replay and assert scores reset
    await page.click("#replay-button");
    await page.waitForTimeout(50);
    const score = page.locator("#score-display");
    await expect(score).toContainText(/You:\s*0/);
    await expect(score).toContainText(/Opponent:\s*0/);
  });
});
