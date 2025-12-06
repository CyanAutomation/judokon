import { test, expect } from "./fixtures/commonSetup.js";
import { withMutedConsole } from "../tests/utils/console.js";
import { configureApp } from "./fixtures/appConfig.js";
import { completeRoundViaApi } from "./helpers/battleApiHelper.js";

test.describe("Battle CLI - Restart", () => {
  test("should be able to restart a match", async ({ page }) => {
    await withMutedConsole(async () => {
      const app = await configureApp(page, {
        battle: { pointsToWin: 1 }
      });

      await page.goto("/src/pages/battleCLI.html?autostart=1");
      await app.applyRuntime();
      await expect
        .poll(() => page.evaluate(() => window.__TEST_API?.engine?.getPointsToWin?.()))
        .toBe(1);

      const statsContainer = page.locator("#cli-stats");
      await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });

      const statButton = page.locator(".cli-stat").first();
      const statKey = await statButton.getAttribute("data-stat");
      expect(statKey).toBeTruthy();
      await statButton.click();

      const roundResult = await completeRoundViaApi(page, {
        detail: {
          stat: statKey,
          playerVal: 99,
          opponentVal: 1,
          result: {
            message: "You win the round!",
            playerScore: 1,
            opponentScore: 0
          }
        }
      });

      expect(roundResult.ok, roundResult.reason ?? "round completion failed").toBe(true);

      const playAgainButton = page.getByRole("button", { name: "Play Again" });
      await expect(playAgainButton).toBeVisible({ timeout: 10000 });

      await playAgainButton.click();

      await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });

      await expect(page.locator("#score-display")).toHaveAttribute("data-score-player", "0");
      await expect(page.locator("#score-display")).toHaveAttribute("data-score-opponent", "0");

      const countdown = page.locator("#cli-countdown");
      await expect(countdown).toHaveAttribute("data-remaining-time", "0");
      await expect(countdown).toHaveText(/^$/);

      const statButtons = page.locator(".cli-stat[role="button"]");
      await expect(statButtons).toHaveCount(5);
      await expect(statButtons.first()).toBeEnabled();
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
