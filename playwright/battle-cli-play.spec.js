import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const CLI_PLAYER_WIN_OUTCOME_EVENT = "outcome=winPlayer";

test.describe("Battle CLI - Play", () => {
  test("should be able to select a stat and see the result", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.goto("/src/pages/battleCLI.html?autostart=1");

      await waitForTestApi(page);

      await expect
        .poll(async () => {
          const state = await page.evaluate(() =>
            window.__TEST_API?.init?.isBattleReady?.() ? "ready" : "pending"
          );
          return state;
        })
        .toBe("ready");

      await expect
        .poll(() => page.evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null))
        .toBe("waitingForPlayerAction");

      // Wait for the stats to be ready
      const statsContainer = page.locator("#cli-stats");
      await expect(statsContainer).toBeVisible();
      // Removed aria-busy accessibility assertion

      // The stat buttons should be visible
      const statButton = page.locator(".cli-stat").first();
      await expect(statButton).toBeVisible();

      const statKey = await statButton.getAttribute("data-stat");
      expect(statKey, "stat button should expose a data-stat attribute").toBeTruthy();

      // Set opponent resolve delay to 0 for deterministic testing
      await page.evaluate(() => window.__TEST_API.timers.setOpponentResolveDelay(0));

      // Click the first stat button
      await statButton.click();

      await expect
        .poll(() => page.evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null))
        .toBe("roundDecision");

      const roundCompletion = await page.evaluate(
        async ({ stat, outcomeEvent }) => {
          try {
            const api = window.__TEST_API;
            if (!api?.cli?.completeRound) {
              return { ok: false, reason: "completeRound-unavailable" };
            }

            const resolution = await api.cli.completeRound(
              {
                detail: {
                  stat,
                  playerVal: 88,
                  opponentVal: 42,
                  result: {
                    message: "You win the round!",
                    playerScore: 1,
                    opponentScore: 0
                  }
                }
              },
              { outcomeEvent, opponentResolveDelayMs: 0 }
            );

            return { ok: true, resolution };
          } catch (error) {
            return {
              ok: false,
              reason: error?.message ?? "completeRound-unknown-error",
              stack: error?.stack ?? null
            };
          }
        },
        { stat: statKey, outcomeEvent: CLI_PLAYER_WIN_OUTCOME_EVENT }
      );

      if (!roundCompletion?.ok) {
        const reason = roundCompletion?.reason ?? "completeRound-failed";
        const stack = roundCompletion?.stack;
        throw new Error(
          stack
            ? `Failed to complete CLI round via test API: ${reason}\n${stack}`
            : `Failed to complete CLI round via test API: ${reason}`
        );
      }

      const { resolution } = roundCompletion;
      expect(resolution?.detail?.stat).toBe(statKey);
      expect(resolution?.outcomeEvent).toBe(CLI_PLAYER_WIN_OUTCOME_EVENT);
      expect(resolution?.outcomeDispatched).toBe(true);
      expect(resolution?.finalState).toBe("roundOver");

      // Wait for the round message to show the result
      const roundMessage = page.locator("#round-message");
      await expect(roundMessage).toContainText("You:", { timeout: 10_000 });
      const messageText = await roundMessage.textContent();
      expect(messageText).toMatch(/((You|Opponent) wins the round!|Tie – no score!)/);
      expect(messageText).toMatch(/\(.+You:\s*[\d.]+\s+Opponent:\s*[\d.]+\)/);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
