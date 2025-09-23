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

      // Wait for timer to update using semantic expectation on the countdown element
      await expect(timerLocator).toContainText(/Time Left: [1-9]\d*s/, { timeout: 5000 });

      // Verify timer shows a decreasing value by checking it updates
      const initialText = await timerLocator.textContent();
      const initialMatch = initialText?.match(/Time Left: (\d+)s/);
      expect(initialMatch).toBeTruthy();

      // Wait for the timer to tick down at least once
      await page.waitForFunction(
        (initialTime) => {
          const timerEl = document.querySelector('[data-testid="next-round-timer"]');
          if (!timerEl) return false;
          const currentText = timerEl.textContent || "";
          const match = currentText.match(/Time Left: (\d+)s/);
          if (!match) return false;
          const currentTime = parseInt(match[1], 10);
          return currentTime < initialTime;
        },
        parseInt(initialMatch[1], 10),
        { timeout: 5000 }
      );

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
