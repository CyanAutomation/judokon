import { test, expect } from "@playwright/test";

test.describe("Classic Battle stat selection", () => {
  test("buttons enabled after start; clicking resolves and starts cooldown", async ({ page }) => {
    await page.addInitScript(() => {
      window.__OVERRIDE_TIMERS = { roundTimer: 5 };
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await page.waitForSelector("#round-select-2", { state: "visible" });
    await page.click("#round-select-2");

    // Stat buttons should render and be enabled
    const container = page.locator("#stat-buttons");
    await expect(container).toHaveAttribute("data-buttons-ready", "true");
    const buttons = page.locator("#stat-buttons button[data-stat]");
    await expect(buttons.first()).toBeVisible();
    await expect(buttons.first()).toBeEnabled();

    // Click the first stat button
    await buttons.first().click();

    // Timer clears and score updates deterministically
    await page.waitForTimeout(100);
    // Timer should be cleared or show 0s after stat selection
    await expect(page.locator("#next-round-timer")).toHaveText(/^(|Time Left: 0s)$/);
    await expect(page.locator("#score-display")).toContainText(/You:\s*1/);
    await expect(page.locator("#score-display")).toContainText(/Opponent:\s*0/);

    // Cooldown begins and Next becomes ready
    const next = page.locator("#next-button");
    await expect(next).toBeEnabled();
    await expect(next).toHaveAttribute("data-next-ready", "true");
  });
});
