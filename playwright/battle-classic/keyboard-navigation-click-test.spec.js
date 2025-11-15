import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Manual Click Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();
  });

  test("programmatic click works", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Check if click handler was called
    const clickHandlerCalled1 = await page.evaluate(() => window.__statButtonClickCalled || false);
    console.log("Before click - handler called:", clickHandlerCalled1);

    // Programmatically click the first button
    await statButtons.first().click();

    await page.waitForTimeout(50);

    // Check if the click handler was called after programmatic click
    const clickHandlerCalled2 = await page.evaluate(() => window.__statButtonClickCalled || false);
    console.log("After programmatic click - handler called:", clickHandlerCalled2);

    // Check if buttons are disabled
    const disabledCount = await page.locator('[data-testid="stat-button"]:disabled').count();
    console.log("Disabled count after click:", disabledCount);
  });

  test("playwright click() works", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Use Playwright's click method
    await statButtons.first().click();

    await page.waitForTimeout(50);

    // Check if the click handler was called
    const clickHandlerCalled = await page.evaluate(() => window.__statButtonClickCalled || false);
    console.log("After playwright click - handler called:", clickHandlerCalled);

    // Check if buttons are disabled
    const disabledCount = await page.locator('[data-testid="stat-button"]:disabled').count();
    console.log("Disabled count:", disabledCount);
  });
});
