import { test, expect } from "@playwright/test";

test.describe("Classic Battle timer clearing", () => {
  test("timer is cleared immediately when stat selection is made", async ({ page }) => {
    await page.addInitScript(() => {
      window.__OVERRIDE_TIMERS = { roundTimer: 5 };
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match
    await page.waitForSelector("#round-select-2", { state: "visible" });
    await page.click("#round-select-2");

    // Wait for stat buttons to be ready
    const container = page.locator("#stat-buttons");
    await expect(container).toHaveAttribute("data-buttons-ready", "true");
    const buttons = page.locator("#stat-buttons button[data-stat]");
    await expect(buttons.first()).toBeVisible();

    // Verify timer is initially running
    const timerLocator = page.locator("#next-round-timer");
    await expect(timerLocator).toHaveText(/Time Left: [1-5]s/);

    // Click stat button
    await buttons.first().click();

    // Timer should be cleared immediately
    await expect(timerLocator).toHaveText(/^(|Time Left: 0s)$/);

    // Score should be updated
    await expect(page.locator("#score-display")).toContainText(/You:\s*1/);
    await expect(page.locator("#score-display")).toContainText(/Opponent:\s*0/);
  });
});
