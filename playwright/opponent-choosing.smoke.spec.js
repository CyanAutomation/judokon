import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    await page.goto("/index.html");

    // Disable auto-select before navigating to battle page
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        autoSelect: false
      };
    });

    // Navigate to Classic Battle and wait for navigation to complete
    const navigationPromise = page.waitForURL("**/battleClassic.html");

    const startBtn =
      (await page.$('[data-testid="start-classic"]')) ||
      (await page.getByText("Classic Battle").first());
    await startBtn.click();

    // Wait for the navigation to complete
    await navigationPromise;

    // Wait for battle to be ready
    await waitForBattleReady(page, { allowFallback: true });

    // Wait for the battle state to be ready for player action
    await waitForBattleState(page, "waitingForPlayerAction", {
      allowFallback: true,
      timeout: 10_000
    });

    // Wait for stat buttons to be enabled
    const firstStat = page.locator("#stat-buttons button").first();
    await expect(firstStat).toBeEnabled();

    // Wait for the initial snackbar to disappear before clicking a stat
    const snackbar = page.locator("#snackbar-container .snackbar");
    await expect(snackbar).toBeHidden({ timeout: 5000 });

    // Click a stat to trigger the opponent choosing state
    await firstStat.click();

    // Snackbar shows the opponent choosing message
    await expect(snackbar).toBeVisible({ timeout: 5000 });
    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i);
  });
});
