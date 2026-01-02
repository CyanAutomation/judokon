import { test, expect } from "./fixtures/commonSetup.js";
import { withMutedConsole } from "../tests/utils/console.js";
import { configureApp } from "./fixtures/appConfig.js";
import { completeRoundViaApi } from "./helpers/battleApiHelper.js";
import { getBattleStateWithErrorHandling, waitForBattleState } from "./helpers/battleStateHelper.js";

test.describe("Battle CLI - Restart", () => {
  test("should be able to restart a match", async ({ page }) => {
    await withMutedConsole(async () => {
      const matchEndStates = new Set(["matchDecision", "matchOver"]);
      const maxRounds = 8;
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

      const playAgainLocator = page.locator("#play-again-button");
      let roundResult = null;
      for (let roundIndex = 0; roundIndex < maxRounds; roundIndex += 1) {
        const statButton = page.locator(".cli-stat").first();
        await statButton.click();

        try {
          roundResult = await completeRoundViaApi(page);
        } catch (error) {
          throw new Error(`Failed to complete round via API: ${error.message}`);
        }

        expect(roundResult.ok, roundResult.reason ?? "round completion failed").toBe(true);

        if (matchEndStates.has(roundResult.finalState)) {
          break;
        }

        const battleState = await getBattleStateWithErrorHandling(page);
        if (battleState.ok && matchEndStates.has(battleState.state)) {
          break;
        }

        if ((await playAgainLocator.count()) > 0) {
          break;
        }

        await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });
      }

      expect(roundResult).not.toBeNull();

      const playAgainButton = page.getByRole("button", { name: "Play Again" });
      await expect(playAgainButton).toBeVisible({ timeout: 10000 });

      await playAgainButton.click();

      await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });

      await expect(page.locator("#score-display")).toHaveAttribute("data-score-player", "0");
      await expect(page.locator("#score-display")).toHaveAttribute("data-score-opponent", "0");

      const countdown = page.locator("#cli-countdown");
      await expect(countdown).toHaveAttribute("data-remaining-time", /\d+/);

      const statButtons = page.locator('.cli-stat[role="button"]');
      await expect(statButtons).toHaveCount(5);
      await expect(statButtons.first()).toBeEnabled();
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
