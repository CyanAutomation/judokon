import { test, expect } from "@playwright/test";

test.describe("Classic Battle timer clearing", () => {
  test("score is updated immediately when stat selection is made", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();

    // Wait for stat buttons to be ready
    const container = page.getByTestId("stat-buttons");
    await expect(container).toHaveAttribute("data-buttons-ready", "true");
    const buttons = page.getByTestId("stat-button");
    await expect(buttons.first()).toBeVisible();

    // Verify timer is initially running
    const timerLocator = page.getByTestId("next-round-timer");
    await expect(timerLocator).toHaveText(/Time Left: \d+s/);

    // Click stat button
    await buttons.first().click();

    // Score should be updated
    const score = page.getByTestId("score-display");
    await expect(score).toContainText(/You:\s*1/);
    await expect(score).toContainText(/Opponent:\s*0/);
  });
});
