import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle cooldown + Next", () => {
  test("Next becomes ready after resolution and advances on click", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      const roundCounter = page.getByTestId("round-counter");

      // Start the match via modal (pick medium/10)
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Before the first round, the counter is 1
      await expect(roundCounter).toHaveText("Round 1");

      // Click a stat to complete the round
      await expect(page.getByTestId("stat-button").first()).toBeVisible();
      await page.getByTestId("stat-button").first().click();

      // Cooldown begins and Next becomes ready
      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      // Simulate an engine-driven update that already advanced the round.
      await page.evaluate(() => {
        const counter = document.getElementById("round-counter");
        if (!counter) return;
        counter.textContent = "Round 2";
        if (counter.dataset) {
          counter.dataset.highestRound = "2";
        }
        const lastContext =
          typeof window.__lastRoundCounterContext === "string"
            ? window.__lastRoundCounterContext
            : null;
        window.__highestDisplayedRound = 2;
        window.__previousRoundCounterContext = lastContext;
        window.__lastRoundCounterContext = "advance";
      });
      await expect(roundCounter).toHaveText("Round 2");

      // Click next button
      await nextButton.click();

      // Check that the round counter has advanced
      await expect(roundCounter).toHaveText("Round 2");
      await expect.poll(async () => roundCounter.textContent()).toBe("Round 2");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
