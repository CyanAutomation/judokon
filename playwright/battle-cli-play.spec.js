import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("Battle CLI - Play", () => {
  test("should be able to select a stat and see the result", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.goto("/src/pages/battleCLI.html?autostart=1");

      await page.waitForFunction(() => window.__TEST_API?.state?.dispatchBattleEvent);
      await page.waitForFunction(() => window.__TEST_API?.cli?.resolveRound);

      // Wait for the stats to be ready
      const statsContainer = page.locator("#cli-stats");
      await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });

      // The stat buttons should be visible
      const statButton = page.locator(".cli-stat").first();
      await expect(statButton).toBeVisible();

      // Set opponent resolve delay to 0 for deterministic testing
      await page.evaluate(() => window.__TEST_API.timers.setOpponentResolveDelay(0));

      // Click the first stat button
      await statButton.click();

      const statKey = await statButton.getAttribute("data-stat");

      // Force the round to resolve by expiring the selection timer
      await page.evaluate(() => window.__TEST_API.timers.expireSelectionTimer());

      await page.evaluate(
        async (stat) =>
          await window.__TEST_API.cli.resolveRound({
            detail: {
              stat,
              playerVal: 88,
              opponentVal: 42,
              result: {
                message: "Player wins the round!",
                playerScore: 1,
                opponentScore: 0
              }
            }
          }),
        statKey
      );

      // Wait for the round message to show the result
      const roundMessage = page.locator("#round-message");
      await expect(roundMessage).not.toBeEmpty({ timeout: 10000 });
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
