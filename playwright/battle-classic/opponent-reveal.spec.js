import { test, expect } from "@playwright/test";

test.describe("Classic Battle opponent reveal", () => {
  test("shows 'Opponent is choosing…' before outcome", async ({ page }) => {
    await page.addInitScript(() => {
      window.__OVERRIDE_TIMERS = { roundTimer: 5 };
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
      window.__OPPONENT_RESOLVE_DELAY_MS = 120;
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await page.waitForSelector("#round-select-2", { state: "visible" });
    await page.click("#round-select-2");

    // Set a short opponent delay for the snackbar message
    await page.evaluate(async () => {
      const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
      setOpponentDelay(50);
    });

    // Click the first stat
    const firstStat = page.locator("#stat-buttons button[data-stat]").first();
    await firstStat.click();

    // Expect the snackbar to show opponent choosing soon
    const snack = page.locator("#snackbar-container");
    await expect(snack).toContainText(/Opponent is choosing/i, { timeout: 1000 });

    // After resolution delay, outcome should apply and cooldown begin
    await page.waitForTimeout(200);
    await expect(page.locator("#score-display")).toContainText(/You:\s*1/);
    const next = page.locator("#next-button");
    await expect(next).toBeEnabled();
    await expect(next).toHaveAttribute("data-next-ready", "true");
  });
});
