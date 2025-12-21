import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle keyboard navigation DEBUG", () => {
  test.skip("skip verbose debug tests", () => {});

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
    const initialWithClassCount = await page
      .locator('[data-testid="stat-button"].disabled')
      .count();
    console.log("Initial disabled (attribute):", initialDisabledCount);
    console.log("Initial disabled (class):", initialWithClassCount);

    // Press Enter to select the first stat button
    await page.keyboard.press("Enter");
    await expect(firstStatButton).toBeDisabled({ timeout: 1_000 });

    // Wait for cooldown state after selection (roundDecision is too transient to wait for)
    await waitForBattleState(page, "cooldown", { timeout: 7_500 });
    console.log("After Enter - Battle state reached:", "cooldown");

    // Countdown text is visible via the snackbar/timer UI
    const timerElement = page.getByTestId("next-round-timer");
    const timerText =
      (await timerElement.count()) > 0 ? ((await timerElement.textContent())?.trim() ?? "") : "";
    console.log("After Enter - Timer text:", timerText || "<empty>");

    // Check state immediately after Enter
    const afterEnterDisabledCount = await page
      .locator('[data-testid="stat-button"]:disabled')
      .count();
    const afterEnterWithClassCount = await page
      .locator('[data-testid="stat-button"].disabled')
      .count();
    console.log("After Enter - Disabled button count (attribute):", afterEnterDisabledCount);
    console.log("After Enter - Disabled button count (class):", afterEnterWithClassCount);
    // Wait for cooldown state
    await waitForBattleState(page, "cooldown", { timeout: 10_000 });

    // Check state during cooldown
    const duringCooldownDisabledCount = await page
      .locator('[data-testid="stat-button"]:disabled')
      .count();
    const duringCooldownWithClassCount = await page
      .locator('[data-testid="stat-button"].disabled')
      .count();
    console.log("During cooldown - Battle state reached:", "cooldown");
    console.log("During cooldown - disabled (attribute):", duringCooldownDisabledCount);
    console.log("During cooldown - disabled (class):", duringCooldownWithClassCount);

    // Wait for next round
    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

    // Check state after returning to waitingForPlayerAction
    const afterCooldownDisabledCount = await page
      .locator('[data-testid="stat-button"]:disabled')
      .count();
    const afterCooldownWithClassCount = await page
      .locator('[data-testid="stat-button"].disabled')
      .count();
    console.log("After cooldown - Battle state reached:", "waitingForPlayerAction");
    console.log("After cooldown - disabled (attribute):", afterCooldownDisabledCount);
    console.log("After cooldown - disabled (class):", afterCooldownWithClassCount);

    await expect(firstStatButton).toBeEnabled({ timeout: 1_000 });
  });
});
