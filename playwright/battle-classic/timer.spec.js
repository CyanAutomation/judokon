import { test, expect } from "../fixtures/commonSetup.js";
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

      // Select Medium battle (5 points) which should start a timer
      await page.getByRole("button", { name: "Medium" }).click();

      // Verify modal is dismissed
      await expect(page.getByRole("dialog")).not.toBeVisible();

      await page.evaluate(() => window.__TEST_API?.state?.waitForBattleState?.("roundSelect"));

      // Verify timer appears and shows countdown
      const timerLocator = page.getByTestId("next-round-timer");
      await expect(timerLocator).toContainText(/Time Left: \d+s/);

      const parseTimerValue = async () => {
        const text = (await timerLocator.textContent()) || "";
        const match = text.match(/Time Left:\s*(\d+)s/i);
        return match ? Number.parseInt(match[1], 10) : null;
      };

      await expect.poll(parseTimerValue, { timeout: 5_000 }).toBeGreaterThan(0);

      const initialCountdownValue = await parseTimerValue();
      expect(typeof initialCountdownValue).toBe("number");

      // Wait a moment to ensure timer has time to tick
      // Wait for timer to tick by polling until value changes
      await expect
        .poll(
          async () => {
            const currentValue = await parseTimerValue();
            return currentValue !== initialCountdownValue;
          },
          { timeout: 5_000 }
        )
        .toBe(true);

      await expect
        .poll(parseTimerValue, { timeout: 5_000 })
        .toBeLessThan(/** @type {number} */ (initialCountdownValue));

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
