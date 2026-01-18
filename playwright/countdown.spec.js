import { test, expect } from "./fixtures/battleCliFixture.js";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("Battle CLI countdown timing", () => {
  test("shows countdown ticks and advances to the next round", async ({ page }) =>
    withMutedConsole(async () => {
      // Countdown contract:
      // - Selection countdown renders user-facing text in the format "Time remaining: {n}"
      //   using the configured duration for the round.
      // - The text ticks down each second while waiting for the player to pick a stat.
      // - After a stat is chosen, the countdown clears before resetting to the full
      //   duration when the next round starts (reflected by the round counter increment).
      await page.addInitScript(() => {
        const existingOverrides = typeof window !== "undefined" ? window.__FF_OVERRIDES || {} : {};
        window.__FF_OVERRIDES = { ...existingOverrides, selectionCountdownSeconds: 5 };
      });

      await page.goto("/src/pages/battleCLI.html?autostart=1");

      const countdown = page.locator("#cli-countdown");
      await expect(countdown).toBeVisible({ timeout: 5_000 });

      await page.waitForFunction(() => window.__TEST_API?.timers?.setCountdown);

      await page.evaluate((seconds) => {
        const setCountdown = window.__TEST_API?.timers?.setCountdown;
        if (typeof setCountdown !== "function") {
          throw new Error("Test API setCountdown method not available");
        }
        setCountdown(seconds);
      }, 5);
      await expect(countdown).toHaveAttribute("data-remaining-time", "5", { timeout: 2_000 });

      await page.evaluate((seconds) => {
        const setCountdown = window.__TEST_API?.timers?.setCountdown;
        if (typeof setCountdown !== "function") {
          throw new Error("Test API setCountdown method not available");
        }
        setCountdown(seconds);
      }, 2);
      await expect(countdown).toHaveAttribute("data-remaining-time", "2", { timeout: 2_000 });

      const roundCounter = page.getByTestId("round-counter");
      await expect(roundCounter).toHaveText(/Round\s+1/, { timeout: 5_000 });

      const statButton = page.locator(".cli-stat").first();
      await expect(statButton).toBeVisible({ timeout: 5_000 });
      await expect(statButton).toBeEnabled({ timeout: 5_000 });
      await statButton.click();

      await expect(page.locator("#snackbar-container .snackbar-bottom")).toContainText(
        /You Picked:/,
        {
          timeout: 2_000
        }
      );

      const roundAdvanced = await page.evaluate(async () => {
        const waitForRounds = window.__TEST_API?.state?.waitForRoundsPlayed;
        if (typeof waitForRounds !== "function") return false;
        return waitForRounds(1, 5_000);
      });

      expect(roundAdvanced).toBe(true);

      await expect(roundCounter).toHaveText(/Round\s+2/, { timeout: 8_000 });

      await expect(statButton).toBeEnabled({ timeout: 6_000 });

      await page.evaluate((seconds) => {
        const setCountdown = window.__TEST_API?.timers?.setCountdown;
        if (typeof setCountdown !== "function") {
          throw new Error("Test API setCountdown method not available");
        }
        setCountdown(seconds);
      }, 4);
      await expect(countdown).toHaveAttribute("data-remaining-time", "4", { timeout: 2_000 });
    }, ["log", "warn", "error"]));
});
