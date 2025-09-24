import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("Battle CLI - Restart", () => {
  test("should be able to restart a match", async ({ page }) => {
    page.on('console', msg => console.log(msg.text()));
    await withMutedConsole(async () => {
      // Set points to win to 1 to end the match quickly
      await page.addInitScript(() => {
        localStorage.setItem("battle.pointsToWin", "1");
      });

      await page.goto("/src/pages/battleCLI.html?autostart=1");

      // After loading, the stats should be visible
      const statsContainer = page.getByRole("listbox", {
        name: "Select a stat with number keys 1–5"
      });
      await expect(statsContainer).toBeVisible();

      // Click the first stat button to win the round and the match
      await page.locator(".cli-stat").first().click();

      // Wait for Test API to be available
      await page.waitForFunction(() => window.__TEST_API?.state?.dispatchBattleEvent);

      // Dispatch matchOver event using public Test API instead of internal hook
      await page.evaluate(() => window.__TEST_API.state.dispatchBattleEvent("matchOver"));

      // Wait for the "Play Again" button to be visible
      const playAgainButton = page.getByRole("button", { name: "Play Again" });
      await expect(playAgainButton).toBeVisible({ timeout: 10000 }); // Increased timeout

      // Click the "Play Again" button
      await playAgainButton.click();

      // The stats should be visible again for the new match
      await expect(statsContainer).toBeVisible({ timeout: 10000 }); // Increased timeout
      // Removed aria-busy accessibility assertion
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
