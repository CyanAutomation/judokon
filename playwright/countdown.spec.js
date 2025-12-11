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

      await expect(countdown).toHaveText(/Time remaining:\s*0?[45]/, { timeout: 5_000 });
      await expect(countdown).toHaveText(/Time remaining:\s*0?3/, { timeout: 6_000 });

      const roundCounter = page.getByTestId("round-counter");
      await expect(roundCounter).toHaveText(/Round\s+1/, { timeout: 5_000 });

      const statButton = page.locator(".cli-stat").first();
      await expect(statButton).toBeVisible({ timeout: 5_000 });
      await expect(statButton).toBeEnabled({ timeout: 5_000 });
      await statButton.click();

      await expect(page.locator("#snackbar-container .snackbar")).toHaveText(/You Picked:/, {
        timeout: 2_000
      });

      await expect(countdown).toHaveText(/^(\s*)?$/, { timeout: 7_000 });

      await expect(roundCounter).toHaveText(/Round\s+2/, { timeout: 12_000 });

      await expect(statButton).toBeEnabled({ timeout: 6_000 });
      await expect(countdown).toHaveText(/Time remaining:\s*0?[45]/, { timeout: 8_000 });
    }, ["log", "warn", "error"]));
});
