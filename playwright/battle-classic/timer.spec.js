import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";
import {
  getCountdownValue,
  waitForCountdownDecrease,
} from "../helpers/timerHelper.js";

/**
 * Waits for the countdown to tick down at least once and returns the observed value.
 * @param {import("@playwright/test").Page} page
 * @param {number} initialValue
 */
async function waitForCountdownTick(page, initialValue) {
  return await waitForCountdownDecrease(page, initialValue);
}

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

      // Select Medium battle (5 points) which should start a timer
      await page.getByRole("button", { name: "Medium" }).click();

      // Verify modal is dismissed
      await expect(page.getByRole("dialog")).not.toBeVisible();

      await page.evaluate(() =>
        window.__TEST_API?.state?.waitForBattleState?.("waitingForPlayerAction")
      );

      // Verify timer appears and shows countdown
      const timerLocator = page.getByTestId("next-round-timer");
      await expect(timerLocator).toContainText(/Time Left: \d+s/);

      const initialCountdown = await getCountdownValue(page);
      expect(typeof initialCountdown).toBe("number");
      expect(initialCountdown).toBeGreaterThan(0);
      const initialCountdownValue = /** @type {number} */ (initialCountdown);
      await expect(timerLocator).toContainText(new RegExp(`Time Left: ${initialCountdownValue}s`));

      const decreasedCountdown = await waitForCountdownTick(page, initialCountdownValue);

      expect(typeof decreasedCountdown).toBe("number");
      expect(decreasedCountdown).toBeLessThan(initialCountdownValue);

      await expect(timerLocator).toContainText(new RegExp(`Time Left: ${decreasedCountdown}s`));

      // Verify battle state is properly initialized
      await expect(page.locator("body")).toHaveAttribute("data-target", "5");
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

      // Wait for modal and select Long battle (10 points)
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Long" }).click();

      // Verify timer starts for Long battle
      const timerLocator = page.getByTestId("next-round-timer");
      await expect(timerLocator).toContainText(/Time Left: \d+s/);

      // Verify battle state is set correctly
      await expect(page.locator("body")).toHaveAttribute("data-target", "10");

      // Verify round counter and score display are initialized
      await expect(page.getByTestId("round-counter")).toContainText("Round 1");
      await expect(page.getByTestId("score-display")).toContainText("You: 0 Opponent: 0");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
