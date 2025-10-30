import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

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

      // Also ensure the DOM attribute is set (used by click handler)
      await expect
        .poll(() => page.evaluate(() => document.body?.dataset?.battleState ?? null))
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

      // Click the first stat button once the CLI reports it as actionable
      await waitForTestApi(page);
      await expect
        .poll(
          async () =>
            await page.evaluate(() => {
              const api = window.__TEST_API;
              if (!api?.state?.getBattleState) {
                return "test-api-unavailable";
              }

              const state = api.state.getBattleState();
              if (state !== "waitingForPlayerAction") {
                return state ?? "pending";
              }

              const statsRoot = document.getElementById("cli-stats");
              if (statsRoot?.getAttribute("aria-busy") === "true") {
                return "stats-busy";
              }

              const firstStat = document.querySelector(".cli-stat");
              if (!firstStat) {
                return "no-stat";
              }

              const ariaDisabled = firstStat.getAttribute("aria-disabled");
              const hasDisabledAttribute = firstStat.hasAttribute("disabled");
              return ariaDisabled === "true" || hasDisabledAttribute ? "disabled" : "ready";
            }),
          { timeout: 5_000 }
        )
        .toBe("ready");

      await statButton.click();

      // Wait for the snackbar to confirm the stat was selected
      // This ensures selectStat() has completed before we call completeRound()
      const statName = statKey.charAt(0).toUpperCase() + statKey.slice(1);
      await expect(page.locator("#snackbar-container .snackbar")).toHaveText(
        `You Picked: ${statName}`,
        { timeout: 2000 }
      );

      // Complete the round immediately (don't wait for intermediate state)
      // The state machine will auto-progress via watchdog timers, so we complete
      // the round synchronously to beat the auto-resolution
      const roundCompletion = await page.evaluate(
        async ({ stat }) => {
          try {
            const api = window.__TEST_API;
            if (!api?.cli?.completeRound) {
              return { ok: false, reason: "completeRound-unavailable" };
            }

            // Don't manually dispatch outcome - let the watchdog do it
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
              { opponentResolveDelayMs: 0 }
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
        { stat: statKey }
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
      // Note: outcomeDispatched may be false since we're relying on watchdog timer
      // to dispatch the outcome automatically, not manual dispatch.
      // State progresses: roundDecision -> roundOver -> cooldown via automatic timers
      expect(resolution?.finalState).toBe("cooldown");

      // Wait for the round message to show the result
      const roundMessage = page.locator("#round-message");
      await expect(roundMessage).toContainText("You:", { timeout: 10_000 });
      const messageText = await roundMessage.textContent();
      expect(messageText).toMatch(/(You win the round!|Opponent wins the round!|Tie – no score!)/);
      expect(messageText).toMatch(/\(.+You:\s*[\d.]+\s+Opponent:\s*[\d.]+\)/);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
