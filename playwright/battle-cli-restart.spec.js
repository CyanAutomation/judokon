import { test, expect } from "./fixtures/commonSetup.js";
import { withMutedConsole } from "../tests/utils/console.js";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForBattleState } from "./helpers/battleStateHelper.js";

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

      await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

      await page.evaluate(() => {
        const detail = {
          outcome: "matchWinPlayer",
          winner: "player",
          playerScore: 1,
          opponentScore: 0,
          scores: { player: 1, opponent: 0 },
          result: {
            matchEnded: true,
            outcome: "matchWinPlayer",
            playerScore: 1,
            opponentScore: 0
          }
        };
        if (typeof window.emitBattleEvent === "function") {
          window.emitBattleEvent("matchOver", detail);
          window.emitBattleEvent("match.concluded", {
            winner: "player",
            scores: { player: 1, opponent: 0 },
            reason: "matchWinPlayer"
          });
        }
      });

      const playAgainButton = page.getByRole("button", { name: "Play Again" });
      await expect(playAgainButton).toBeVisible({ timeout: 10000 });

      await playAgainButton.click();

      await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });

      await expect(page.locator("#score-display")).toHaveAttribute("data-score-player", "0");
      await expect(page.locator("#score-display")).toHaveAttribute("data-score-opponent", "0");

      const countdown = page.locator("#cli-countdown");
      await expect(countdown).toHaveAttribute("data-remaining-time", /\d+/);

      const statButtons = page.locator('.cli-stat[role="option"]');
      await expect(statButtons).toHaveCount(5);
      await expect(statButtons.first()).toBeEnabled();
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
