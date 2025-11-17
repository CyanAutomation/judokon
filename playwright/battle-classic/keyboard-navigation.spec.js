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

  test("should allow tab navigation to stat buttons and keyboard activation", async ({ page }) => {
    // Wait for stat buttons to be enabled via battle state readiness
    const statButtons = page.getByTestId("stat-button");
    await expectBattleStateReady(page, "waitingForPlayerAction");
    const statButtonCount = await statButtons.count();
    const firstStatButton = statButtons.first();
    const focusedStatButton = page.locator('[data-testid="stat-button"]:focus');
    await expect(firstStatButton).toBeEnabled();

    // Ensure the first stat button naturally receives focus when ready
    await expect(focusedStatButton).toHaveCount(1);
    await expect(firstStatButton).toBeFocused();

    // Tab to the second stat button
    await page.keyboard.press("Tab");
    await expect(statButtons.nth(1)).toBeFocused();

    // Tab to the third stat button
    await page.keyboard.press("Tab");
    await expect(statButtons.nth(2)).toBeFocused();

    const thirdStatButton = statButtons.nth(2);

    // Press Enter to select the third stat button (should trigger click event on focused button)
    await page.keyboard.press("Enter");

    // Verify that selection occurred (timer should start, buttons should be disabled)
    await expect(page.getByTestId("next-round-timer")).toHaveText(/^(|Time Left: \d+s)$/);
    // Check that all buttons are disabled once the round resolves
    const disabledStatButtons = page.locator('[data-testid="stat-button"]:disabled');
    await expect(thirdStatButton).toBeDisabled();
    await expect(disabledStatButtons).toHaveCount(statButtonCount);

    // Confirm stat buttons remain disabled while the round resolves and cooldown runs
    await waitForBattleState(page, "cooldown", { timeout: 10_000 });
    await expect(disabledStatButtons).toHaveCount(statButtonCount);

    // Await the next round readiness through battle state + stat button readiness helpers
    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });
    await waitForStatButtonsReady(page, { timeout: 10_000 });

    // Once the next round starts, the stat buttons should be interactive again
    await expect(thirdStatButton).toBeEnabled();
    await expect(disabledStatButtons).toHaveCount(0);
  });

  test("should show visible focus styles on stat buttons", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    const focusedStatButton = page.locator('[data-testid="stat-button"]:focus');
    await expectBattleStateReady(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Verify the naturally focused button displays the expected outline
    await expect(focusedStatButton).toHaveCount(1);
    await expect(statButtons.first()).toBeFocused();

    // Check that focus styles are applied (outline should be visible)
    await expect(focusedStatButton).toHaveCSS("outline-style", "solid");
    await expect(focusedStatButton).toHaveCSS("outline-width", "2px");
  });

  test("should have proper ARIA labels on stat buttons", async ({ page }) => {
    // Check ARIA labels on stat buttons
    const statButtons = page.getByTestId("stat-button");
    await expectBattleStateReady(page, "waitingForPlayerAction");
    const ariaLabelPatterns = ["Power", "Speed", "Technique"].map(
      (stat) => new RegExp(`^(Select ${stat} stat for battle|${stat})$`, "i")
    );
    await expect(statButtons.first()).toHaveAttribute("aria-label", ariaLabelPatterns[0]);
    await expect(statButtons.nth(1)).toHaveAttribute("aria-label", ariaLabelPatterns[1]);
    await expect(statButtons.nth(2)).toHaveAttribute("aria-label", ariaLabelPatterns[2]);
  });
});
