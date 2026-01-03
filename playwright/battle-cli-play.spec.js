import { test, expect } from "./fixtures/battleCliFixture.js";
import { withMutedConsole } from "../tests/utils/console.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

test.describe("Battle CLI - Play", () => {
  test("should be able to select a stat and see the result", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.goto("/src/pages/battleCLI.html?autostart=1");

      await waitForTestApi(page);

      await expect
        .poll(async () => {
          return await page.evaluate(() => {
            const api = window.__TEST_API;
            if (!api?.init?.isBattleReady?.()) {
              return "battle-not-ready";
            }

            const battleState = api.state?.getBattleState?.();
            if (battleState !== "waitingForPlayerAction") {
              return battleState ?? "battle-state-pending";
            }

            if (document.body?.dataset?.battleState !== "waitingForPlayerAction") {
              return "dom-state-pending";
            }

            const statsRoot = document.getElementById("cli-stats");
            if (!statsRoot || statsRoot.getAttribute("aria-busy") === "true") {
              return "stats-not-ready";
            }

            const firstStat = document.querySelector(".cli-stat");
            if (!firstStat) {
              return "no-stat";
            }

            const ariaDisabled = firstStat.getAttribute("aria-disabled");
            const hasDisabledAttribute = firstStat.hasAttribute("disabled");
            return ariaDisabled === "true" || hasDisabledAttribute ? "disabled" : "ready";
          });
        })
        .toBe("ready");

      const statsContainer = page.locator("#cli-stats");
      await expect(statsContainer).toBeVisible();

      const statButton = page.locator(".cli-stat").first();
      await expect(statButton).toBeVisible();

      const statKey = await statButton.getAttribute("data-stat");
      expect(statKey, "stat button should expose a data-stat attribute").toBeTruthy();

      await statButton.click();

      // Wait for the snackbar to confirm the stat was selected
      // This ensures selectStat() has completed before we call completeRound()
      // With snackbar stacking, use getByText to find the specific message
      const statName = statKey.charAt(0).toUpperCase() + statKey.slice(1);
      await expect(page.getByText(`You Picked: ${statName}`)).toBeVisible({
        timeout: 2000
      });

      // Wait for the round message to show the result
      const roundMessage = page.locator("#round-message");
      await expect(roundMessage).toContainText("You:", { timeout: 10_000 });
      const messageText = await roundMessage.textContent();
      expect(messageText).toMatch(/(You win the round!|Opponent wins the round!|Tie – no score!)/);
      expect(messageText).toMatch(/\(.+You:\s*[\d.]+\s+Opponent:\s*[\d.]+\)/);

      const scoreDisplay = page.locator("#score-display");
      await expect(scoreDisplay).toHaveAttribute("data-score-player", /\d+/);
      await expect(scoreDisplay).toHaveAttribute("data-score-opponent", /\d+/);

      const roundCounter = page.locator("#round-counter");
      const roundCounterText = await roundCounter.textContent();
      await expect(roundCounter).not.toHaveText(roundCounterText ?? "");

      await expect(page.locator("#snackbar-container .snackbar")).toContainText(
        "Select your move",
        {
          timeout: 10_000
        }
      );
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
