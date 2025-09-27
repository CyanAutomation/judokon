import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

async function readCountdown(page) {
  return page.evaluate(() => {
    const getter = window.__TEST_API?.timers?.getCountdown;
    if (typeof getter !== "function") return null;
    return getter();
  });
}

async function waitForCountdownDecrease(page, initialValue, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let lastSeen = initialValue;

  while (Date.now() < deadline) {
    const current = await readCountdown(page);
    if (typeof current === "number") {
      lastSeen = current;
      if (current < initialValue) {
        return current;
      }
    }

    await page.evaluate(
      () =>
        new Promise((resolve) => {
          if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => resolve());
            return;
          }
          if (typeof queueMicrotask === "function") {
            queueMicrotask(resolve);
            return;
          }
          setTimeout(resolve, 0);
        })
    );
  }

  throw new Error(
    `Countdown did not decrease within ${timeoutMs}ms (last value ${lastSeen})`
  );
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

      // Select Medium battle (10 points) which should start a timer
      await page.getByRole("button", { name: "Medium" }).click();

      // Verify modal is dismissed
      await expect(page.getByRole("dialog")).not.toBeVisible();

      await page.evaluate(() =>
        window.__TEST_API?.state?.waitForBattleState?.("waitingForPlayerAction")
      );

      // Verify timer appears and shows countdown
      const timerLocator = page.getByTestId("next-round-timer");
      await expect(timerLocator).toContainText(/Time Left: \d+s/);

      const initialCountdown = await readCountdown(page);
      expect(initialCountdown).not.toBeNull();
      const initialCountdownValue = /** @type {number} */ (initialCountdown);
      expect(initialCountdownValue).toBeGreaterThan(0);
      await expect(timerLocator).toContainText(
        new RegExp(`Time Left: ${initialCountdownValue}s`)
      );

      const decreasedCountdown = await waitForCountdownDecrease(
        page,
        initialCountdownValue
      );

      expect(decreasedCountdown).toBeLessThan(initialCountdownValue);

      await expect(timerLocator).toContainText(
        new RegExp(`Time Left: ${decreasedCountdown}s`)
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
