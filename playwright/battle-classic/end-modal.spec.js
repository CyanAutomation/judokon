import { test, expect } from "@playwright/test";

test.describe("Classic Battle end-of-match flow", () => {
  test("ends match and supports Replay", async ({ page }) => {
    await page.addInitScript(() => {
      window.__OVERRIDE_TIMERS = { roundTimer: 1 };
      window.__NEXT_ROUND_COOLDOWN_MS = 500;
    });
    await page.goto("/src/pages/battleClassic.html");
    // Ensure initialization has created the engine, then pointsToWin=1
    await page.waitForFunction(() => !!window.battleStore);
    await page.evaluate(async () => {
      const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
      setPointsToWin(1);
    });
    await page.click("#round-select-2");
    await page.click("#stat-buttons button[data-stat]");
    // Verify match ended by score reaching 1 and then use Replay control
    await expect(page.locator("#score-display")).toContainText(/You:\s*1/);
    await page.click("#replay-button");
    await expect(page.locator("#score-display")).toContainText(/You:\s*0/);
  });
});
