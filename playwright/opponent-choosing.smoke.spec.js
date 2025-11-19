import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    await page.goto("/index.html");

    await Promise.all([
      page.waitForURL("**/battleClassic.html"),
      (async () => {
        const startBtn =
          (await page.$('[data-testid="start-classic"]')) ||
          (await page.getByText("Classic Battle").first());
        await startBtn.click();
      })()
    ]);

    // Wait for battle to be ready before trying to interact
    await waitForBattleReady(page, { allowFallback: true });

    // Wait for the battle state to transition to waitingForPlayerAction
    await waitForBattleState(page, "waitingForPlayerAction", {
      allowFallback: true,
      timeout: 10_000
    });

    // Wait for stat buttons to render and be clickable
    const firstStat = page.locator("#stat-buttons button").first();
    await expect(firstStat).toBeVisible();
    await expect(firstStat).toBeEnabled();

    // Click a stat to trigger the opponent choosing state
    await firstStat.click();

    // Snackbar element shows the opponent choosing message
    const snackbar = page.locator("#snackbar-container .snackbar");
    await expect(snackbar).toBeVisible({ timeout: 3000 });
    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i);
  });
});
