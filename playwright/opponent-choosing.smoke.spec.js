import { test, expect } from "@playwright/test";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    page.on("console", (msg) => {
      console.log("PAGE LOG:", msg.type(), msg.text());
    });
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = window.__FF_OVERRIDES || {};
      window.__FF_OVERRIDES.opponentDelayMessage = false;
    });
    await page.goto("/index.html");

    const startBtn =
      (await page.$('[data-testid="start-classic"]')) ||
      (await page.getByText("Classic Battle").first());
    await startBtn.click();

    // Wait for stat buttons to render
    const firstStat = page.locator("#stat-buttons button").first();
    await expect(firstStat).toBeVisible();

    // Click a stat to trigger the opponent choosing state
    await firstStat.click();

    await page.waitForTimeout(1000);
    const snapshot = await page.evaluate(() => {
      const el = document.getElementById("snackbar-container");
      return el ? el.textContent : "missing";
    });
    console.log("SNACKBAR SNAPSHOT:", snapshot);
    const disabled = await page.evaluate(() => window.__disableSnackbars ?? "unset");
    console.log("SNACKBAR DISABLED:", disabled);

    // Snackbar element shows the opponent choosing message
    const snackbar = page.locator("#snackbar-container .snackbar");
    await expect(snackbar).toBeVisible({ timeout: 3000 });
    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i);
  });
});
