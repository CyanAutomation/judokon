import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Button Identity Check", () => {
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

  test("check if button element is replaced", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Mark the button with a unique ID
    const buttonId = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      const id = `btn-${Date.now()}-${Math.random()}`;
      btn.dataset.uniqueId = id;
      
      // Also add our own click listener to test
      let clicked = false;
      btn.addEventListener("click", () => {
        clicked = true;
        window.__ourClickHandlerCalled = true;
      });
      
      return { id, clicked };
    });

    console.log("Initial button ID:", buttonId.id);

    // Wait a moment
    await page.waitForTimeout(100);

    // Check if the button still has the same ID (i.e., wasn't replaced)
    const stillSameButton = await page.evaluate((id) => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return {
        hasOurId: btn?.dataset?.uniqueId === id,
        currentId: btn?.dataset?.uniqueId
      };
    }, buttonId.id);

    console.log("Still same button:", JSON.stringify(stillSameButton, null, 2));

    // Now click the button
    await statButtons.first().click();
    await page.waitForTimeout(50);

    // Check if our listener was called
    const ourHandlerCalled = await page.evaluate(() => window.__ourClickHandlerCalled || false);
    const appHandlerCalled = await page.evaluate(() => window.__statButtonClickCalled || false);
    
    console.log("Our click handler called:", ourHandlerCalled);
    console.log("App click handler called:", appHandlerCalled);

    // Check if button is still the same after click
    const afterClickSameButton = await page.evaluate((id) => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return {
        hasOurId: btn?.dataset?.uniqueId === id,
        currentId: btn?.dataset?.uniqueId
      };
    }, buttonId.id);

    console.log("After click, still same button:", JSON.stringify(afterClickSameButton, null, 2));
  });
});
