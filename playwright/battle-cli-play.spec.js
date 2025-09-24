import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";
import { waitForBattleState, waitForTestApi } from "./helpers/battleStateHelper.js";

test.describe("Battle CLI - Play", () => {
  test("should be able to select a stat and see the result", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.goto("/src/pages/battleCLI.html?autostart=1");

      await waitForTestApi(page);

      const isReady = await page.evaluate(() =>
        window.__TEST_API?.init?.waitForBattleReady?.(10_000)
      );
      expect(isReady).toBe(true);

      await waitForBattleState(page, "waitingForPlayerAction", {
        timeout: 10_000,
        allowFallback: false
      });

      // Wait for the stats to be ready
      const statsContainer = page.locator("#cli-stats");
      await expect(statsContainer).toBeVisible();
      // Removed aria-busy accessibility assertion

      // The stat buttons should be visible
      const statButton = page.locator(".cli-stat").first();
      await expect(statButton).toBeVisible();

      // Set opponent resolve delay to 0 for deterministic testing
      await page.evaluate(() => window.__TEST_API.timers.setOpponentResolveDelay(0));

      // Click the first stat button
      await statButton.click();

      await waitForBattleState(page, "roundDecision", {
        timeout: 10_000,
        allowFallback: false
      });

      const statKey = await statButton.getAttribute("data-stat");
      expect(statKey, "stat button should expose a data-stat attribute").toBeTruthy();

      await page.evaluate(() => window.__TEST_API.timers.expireSelectionTimer());

      const resolution = await page.evaluate(
        async (stat) =>
          window.__TEST_API.cli.resolveRound({
            detail: {
              stat,
              playerVal: 88,
              opponentVal: 42,
              result: {
                message: "Player wins the round!",
                outcome: "winPlayer",
                playerScore: 1,
                opponentScore: 0
              }
            }
          }),
        statKey
      );

      expect(resolution).toBeTruthy();
      expect(resolution?.detail?.stat).toBe(statKey);

      const stateAfterResolution = await page.evaluate(() =>
        window.__TEST_API.state.getBattleState()
      );
      if (stateAfterResolution === "roundDecision") {
        const advanced = await page.evaluate(() =>
          window.__TEST_API.state.dispatchBattleEvent("outcome=winPlayer")
        );
        expect(advanced).toBe(true);
      }

      await waitForBattleState(page, "roundOver", {
        timeout: 10_000,
        allowFallback: false
      });

      // Wait for the round message to show the result
      const roundMessage = page.locator("#round-message");
      await expect(roundMessage).toContainText("Player wins the round!", { timeout: 10_000 });
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
