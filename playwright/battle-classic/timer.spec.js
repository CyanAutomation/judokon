import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

async function readCountdown(page) {
  return page.evaluate(() => {
    try {
      const getter = window.__TEST_API?.timers?.getCountdown;
      if (typeof getter !== "function") return null;
      return getter();
    } catch (error) {
      console.warn("Failed to read countdown:", error);
      return null;
    }
  });
}

async function waitForCountdownDecrease(page, initialValue, timeoutMs = 5000) {
  const hasCountdownHelper = await page.evaluate(
    () => typeof window.__TEST_API?.timers?.getCountdown === "function"
  );

  if (!hasCountdownHelper) {
    throw new Error(
      "__TEST_API.timers.getCountdown is not available; ensure timer helpers are exposed in the page context."
    );
  }

  try {
    const countdownHandle = await page.waitForFunction(
      (initial) => {
        const current = window.__TEST_API?.timers?.getCountdown?.();
        return typeof current === "number" && current < initial ? current : undefined;
      },
      initialValue,
      { timeout: timeoutMs, polling: "raf" }
    );

    const value = await countdownHandle.jsonValue();
    await countdownHandle.dispose();
    return /** @type {number} */ (value);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      const lastSeen = await readCountdown(page);
      const lastValue = typeof lastSeen === "number" ? lastSeen : "unavailable";
      throw new Error(
        `Countdown did not decrease below ${initialValue} within ${timeoutMs}ms (last observed ${lastValue})`
      );
    }

    throw error;
  }
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

      const initialCountdown = await readCountdown(page);
      expect(initialCountdown).not.toBeNull();
      expect(typeof initialCountdown).toBe("number");
      expect(initialCountdown).toBeGreaterThan(0);
      const initialCountdownValue = /** @type {number} */ (initialCountdown);
      await expect(timerLocator).toContainText(new RegExp(`Time Left: ${initialCountdownValue}s`));

      const decreasedCountdown = await waitForCountdownDecrease(page, initialCountdownValue);

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
      await page.getByRole("dialog").waitFor();
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
