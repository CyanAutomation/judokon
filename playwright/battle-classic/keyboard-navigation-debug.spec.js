import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState, waitForStatButtonsReady } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle keyboard navigation DEBUG", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
      
      // Hook into button disable/enable for debugging
      window.__buttonStateChanges = [];
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();
  });

  test("debug button state changes", async ({ page }) => {
    // Wait for stat buttons to be enabled via battle state readiness
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    const statButtonCount = await statButtons.count();
    console.log("Initial stat button count:", statButtonCount);

    const firstStatButton = statButtons.first();
    await expect(firstStatButton).toBeEnabled();

    // Check initial state
    const initialDisabledCount = await page.locator('[data-testid="stat-button"]:disabled').count();
    const initialWithClassCount = await page.locator('[data-testid="stat-button"].disabled').count();
    console.log("Initial disabled (attribute):", initialDisabledCount);
    console.log("Initial disabled (class):", initialWithClassCount);

    // Press Enter to select the first stat button
    await page.keyboard.press("Enter");

    // Wait a moment for the async operations
    await page.waitForTimeout(50);

    // Check state immediately after Enter
    const afterEnterDisabledCount = await page.locator('[data-testid="stat-button"]:disabled').count();
    const afterEnterWithClassCount = await page.locator('[data-testid="stat-button"].disabled').count();
    const battleState1 = await page.evaluate(() => document.body?.dataset?.battleState);
    const roundsPlayed1 = await page.evaluate(() => {
      const store = window.__TEST_API?.inspect?.getBattleStore?.();
      return store?.roundsPlayed || 0;
    });
    console.log("After Enter - Battle state:", battleState1);
    console.log("After Enter - Rounds played:", roundsPlayed1);
    console.log("After Enter - disabled (attribute):", afterEnterDisabledCount);
    console.log("After Enter - disabled (class):", afterEnterWithClassCount);

    // Wait for cooldown state
    await waitForBattleState(page, "cooldown", { timeout: 10_000 });

    // Check state during cooldown
    const duringCooldownDisabledCount = await page.locator('[data-testid="stat-button"]:disabled').count();
    const duringCooldownWithClassCount = await page.locator('[data-testid="stat-button"].disabled').count();
    const battleState2 = await page.evaluate(() => document.body?.dataset?.battleState);
    console.log("During cooldown - Battle state:", battleState2);
    console.log("During cooldown - disabled (attribute):", duringCooldownDisabledCount);
    console.log("During cooldown - disabled (class):", duringCooldownWithClassCount);

    // Wait for next round  
    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

    // Check state after returning to waitingForPlayerAction
    const afterCooldownDisabledCount = await page.locator('[data-testid="stat-button"]:disabled').count();
    const afterCooldownWithClassCount = await page.locator('[data-testid="stat-button"].disabled').count();
    const battleState3 = await page.evaluate(() => document.body?.dataset?.battleState);
    console.log("After cooldown - Battle state:", battleState3);
    console.log("After cooldown - disabled (attribute):", afterCooldownDisabledCount);
    console.log("After cooldown - disabled (class):", afterCooldownWithClassCount);
  });
});
