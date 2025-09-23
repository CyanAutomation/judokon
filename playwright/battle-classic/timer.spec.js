import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle timer", () => {
  test("displays and counts down selection timer after round selection", async ({ page }) => {
    await withMutedConsole(async () => {
      // Force the round select modal to show in Playwright tests
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });

      // Navigate to battle page
      await page.goto("/src/pages/battleClassic.html");

      // Wait for round selection modal to appear
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText("Select Match Length")).toBeVisible();

      // Select Medium battle (10 points) which should start a timer
      await page.getByRole("button", { name: "Medium" }).click();

      // Verify modal is dismissed
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Verify timer appears and shows countdown
      const timerLocator = page.getByTestId("next-round-timer");
      await expect(timerLocator).toContainText(/Time Left: \d+s/);

      await page.evaluate(() =>
        window.__TEST_API?.state?.waitForBattleState?.("waitingForPlayerAction")
      );

      // Use Test API to verify timer is active and get initial time
      const initialTime = await page.evaluate(() => {
        const timer = window.__TEST_API?.timers?.getActiveTimer?.();
        return timer ? timer.remaining : null;
      });

      expect(initialTime).toBeGreaterThan(0);

      // Wait for timer to tick down using Test API hook
      await page.waitForFunction(
        () => {
          const timer = window.__TEST_API?.timers?.getActiveTimer?.();
          return timer && timer.remaining < initialTime;
        },
        { timeout: 5000 }
      );

      // Verify timer has decreased
      const updatedTime = await page.evaluate(() => {
        const timer = window.__TEST_API?.timers?.getActiveTimer?.();
        return timer ? timer.remaining : null;
      });

      expect(updatedTime).toBeLessThan(initialTime);
      expect(updatedTime).toBeGreaterThanOrEqual(0);

      // Verify battle state is properly initialized
      await expect(page.locator("body")).toHaveAttribute("data-target", "10");
      await expect(page.getByTestId("round-counter")).toContainText("Round 1");
    }, ["log", "info", "warn", "error", "debug"]);
  });

  test("timer initializes correctly for different round lengths", async ({ page }) => {
    await withMutedConsole(async () => {
      // Force the round select modal to show in Playwright tests
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });

      await page.goto("/src/pages/battleClassic.html");

      // Wait for modal and select Long battle (15 points)
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Long" }).click();

      // Verify timer starts for Long battle
      const timerLocator = page.getByTestId("next-round-timer");
      await expect(timerLocator).toContainText(/Time Left: \d+s/);

      // Verify battle state is set correctly
      await expect(page.locator("body")).toHaveAttribute("data-target", "15");

      // Verify round counter and score display are initialized
      await expect(page.getByTestId("round-counter")).toContainText("Round 1");
      await expect(page.getByTestId("score-display")).toContainText("You: 0 Opponent: 0");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
