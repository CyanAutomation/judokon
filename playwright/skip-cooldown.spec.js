import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./fixtures/waits.js";

test.describe("Skip cooldown flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Make cooldowns long so we can reliably test skipping them
      window.__NEXT_ROUND_COOLDOWN_MS = 15000;
      // Ensure snackbars remain enabled regardless of prior runs
      window.__disableSnackbars = false;
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: false } } })
      );
    });
    await page.goto("/src/pages/battleClassic.html");
  });

  test("clicking Next button skips cooldown timer", async ({ page }) => {
    await page.locator("#round-select-1").click();
    await waitForBattleReady(page);
    await page.evaluate(() => window.statButtonsReadyPromise);

    // Click a stat to finish the round
    await page.locator("button[data-stat='power']").click();

    // Wait for the cooldown to start
    await waitForBattleState(page, "cooldown");

    // Check that the snackbar shows a long cooldown
    await page.waitForTimeout(1000);
    const snackbar = page.locator(".snackbar");
    await expect(snackbar).toHaveText(/Next round in: 1\\d+s/);

    // Click the Next button to skip the cooldown
    await page.locator("#next-button").click();

    // Assert that the next round starts immediately
    await waitForBattleState(page, "waitingForPlayerAction");

    // Verify that stat buttons are enabled for the new round
    await expect(page.locator("#stat-buttons button").first()).toBeEnabled({ timeout: 5000 });
  });
});
