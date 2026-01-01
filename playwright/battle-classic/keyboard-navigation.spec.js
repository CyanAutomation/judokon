import { test, expect } from "../fixtures/commonSetup.js";
import { waitForStatButtonsReady, waitForBattleReady } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle keyboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Don't show the round select modal - start battle immediately with default settings
    await page.goto("/src/pages/battleClassic.html");

    // Wait for battle to be fully initialized (modal bypass happens automatically in Playwright)
    await waitForBattleReady(page, { allowFallback: false, timeout: 10_000 });
  });

  test("should select a stat with Enter and update the round message", async ({ page }) => {
    const statButtons = page.getByTestId("stat-button");
    const focusedStatButton = page.locator('[data-testid="stat-button"]:focus');
    const roundMessage = page.getByTestId("round-message");

    await waitForStatButtonsReady(page, { timeout: 10_000 });
    await expect(statButtons.first()).toBeEnabled();
    await expect(focusedStatButton).toHaveCount(1);
    await expect(statButtons.first()).toBeFocused();

    await expect(roundMessage).toBeAttached();

    await page.keyboard.press("Enter");

    await expect(statButtons.first()).toBeDisabled();
    await expect(page.locator('[data-testid="stat-button"]:disabled')).toHaveCount(
      await statButtons.count()
    );
    await expect(roundMessage).not.toBeEmpty({ timeout: 5000 });
    await expect(roundMessage).toContainText("You picked:");
    await expect(roundMessage).toContainText("Opponent picked:");
  });
});
