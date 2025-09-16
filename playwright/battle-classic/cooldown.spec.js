import { test, expect } from "@playwright/test";

test.describe("Classic Battle cooldown + Next", () => {
  test("Next becomes ready after resolution and advances on click", async ({ page }) => {
    await page.addInitScript(() => {
      // Speed up timers during e2e: 1s round, 1s cooldown
      window.__OVERRIDE_TIMERS = { roundTimer: 1 };
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal (pick medium/10)
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();

    // Before the first round, the counter is 1
    await expect(page.getByTestId("round-counter")).toHaveText("Round 1");

    // Click a stat to complete the round
    await expect(page.getByTestId("stat-button").first()).toBeVisible();
    await page.getByTestId("stat-button").first().click();

    // Cooldown begins and Next becomes ready
    const nextButton = page.getByTestId("next-button");
    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveAttribute("data-next-ready", "true");

    // Click next button
    await nextButton.click();

    // Check that the round counter has advanced
    await expect(page.getByTestId("round-counter")).toHaveText("Round 2");
  });
});