import { test, expect } from "../fixtures/commonSetup.js";
import {
  waitForBattleState,
  waitForStatButtonsReady,
  waitForBattleReady
} from "../helpers/battleStateHelper.js";

async function expectBattleStateReady(page, stateName, options) {
  try {
    await waitForBattleState(page, stateName, options);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error ?? "unknown error");
    throw new Error(
      `waitForBattleState should resolve state "${stateName}" via Test API (${reason})`
    );
  }
}

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

    await expectBattleStateReady(page, "waitingForPlayerAction");
    await waitForStatButtonsReady(page, { timeout: 10_000 });
    await expect(statButtons.first()).toBeEnabled();
    await expect(focusedStatButton).toHaveCount(1);
    await expect(statButtons.first()).toBeFocused();

    const initialMessage = (await roundMessage.textContent()) ?? "";

    await page.keyboard.press("Enter");

    await expect(statButtons.first()).toBeDisabled();
    await expect.poll(async () => (await roundMessage.textContent()) ?? "").not.toBe(
      initialMessage
    );
  });
});
