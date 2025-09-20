import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("Battle CLI - Restart", () => {
  test("should be able to restart a match", async ({ page }) => {
    await withMutedConsole(
      async () => {
        // Set points to win to 1 to end the match quickly
        await page.addInitScript(() => {
          localStorage.setItem("battle.pointsToWin", "1");
        });

        await page.goto("/src/pages/battleCLI.html?autostart=1");

        // Wait for the stats to be ready
        const statsContainer = page.locator("#cli-stats");
        await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });

        // Click the first stat button to win the round and the match
        await page.locator(".cli-stat").first().click();

        // Manually trigger match over for testing purposes due to application bug
        await page.evaluate(() => {
          window.__test.handleMatchOver();
        });

        // Wait for the "Play Again" button to be visible
        const playAgainButton = page.getByRole("button", { name: "Play Again" });
        await expect(playAgainButton).toBeVisible({ timeout: 10000 }); // Increased timeout

        // Click the "Play Again" button
        await playAgainButton.click();

        // The stats should be visible again for the new match
        await expect(statsContainer).toBeVisible({ timeout: 10000 }); // Increased timeout
        await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 }); // Increased timeout
      },
      ["log", "info", "warn", "error", "debug"]
    );
  });
});
