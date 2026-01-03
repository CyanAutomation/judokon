import { test, expect } from "./fixtures/commonSetup.js";
import { withMutedConsole } from "../tests/utils/console.js";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForBattleState } from "./helpers/battleStateHelper.js";
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

      await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

      const statButtons = page.locator(".cli-stat");
      await expect(statButtons).toHaveCount(5);

      let matchEnded = false;
      const maxRounds = 10;

      for (let roundIndex = 0; roundIndex < maxRounds; roundIndex += 1) {
        await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

        const statButton = statButtons.nth(roundIndex % 5);
        await expect(statButton).toBeVisible();
        await expect(statButton).toBeEnabled();

        const statKey = await statButton.getAttribute("data-stat");
        expect(statKey, "stat button should expose a data-stat attribute").toBeTruthy();
        if (!statKey) {
          throw new Error("Stat button missing data-stat attribute.");
        }

        await statButton.click();

        const statName = statKey.charAt(0).toUpperCase() + statKey.slice(1);
        await expect(page.getByText(`You Picked: ${statName}`)).toBeVisible({ timeout: 2000 });

        const completion = await completeRoundViaApi(page, {
          options: { expireSelection: false, opponentResolveDelayMs: 0 }
        });

        expect(completion.ok).toBe(true);

        if (["matchDecision", "matchOver"].includes(completion.finalState)) {
          await expect(page.locator("#round-message")).toContainText("Match over", {
            timeout: 10_000
          });
          await expect(page.locator("#match-announcement")).toContainText("Match over", {
            timeout: 10_000
          });
          matchEnded = true;
          break;
        }
      }

      if (!matchEnded) {
        throw new Error(
          `Match did not end after ${maxRounds} rounds. This may indicate a test configuration issue or game logic problem.`
        );
      }

      const playAgainButton = page.getByRole("button", { name: "Play Again" });
      await expect(playAgainButton).toBeVisible({ timeout: 10000 });

      await playAgainButton.click();

      await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });

      await expect(page.locator("#score-display")).toHaveAttribute("data-score-player", "0");
      await expect(page.locator("#score-display")).toHaveAttribute("data-score-opponent", "0");

      const countdown = page.locator("#cli-countdown");
      await expect(countdown).toHaveAttribute("data-remaining-time", /\d+/);

      const statOptions = page.locator('.cli-stat[role="option"]');
      await expect(statOptions).toHaveCount(5);
      await expect(statOptions.first()).toBeEnabled();
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
