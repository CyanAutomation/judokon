import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Immediate Button State", () => {
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

  test("check button state immediately before and during click", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Check button state BEFORE click
    const beforeClick = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return {
        disabled: btn.disabled,
        hasDisabledAttr: btn.hasAttribute("disabled"),
        hasDisabledClass: btn.classList.contains("disabled")
      };
    });
    console.log("Before click:", JSON.stringify(beforeClick, null, 2));

    // Install a capturing listener that logs state DURING the click event
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      btn.addEventListener(
        "click",
        (e) => {
          window.__duringClick = {
            disabled: btn.disabled,
            hasDisabledAttr: btn.hasAttribute("disabled"),
            hasDisabledClass: btn.classList.contains("disabled"),
            target: e.target === btn,
            currentTarget: e.currentTarget === btn
          };
        },
        { capture: true }
      ); // Use capture phase to run BEFORE the app's listener
    });

    // Click the button
    await statButtons.first().click();

    await page.waitForTimeout(50);

    // Check state during click
    const duringClick = await page.evaluate(() => window.__duringClick || {});
    console.log("During click (capture phase):", JSON.stringify(duringClick, null, 2));

    // Check if app handler was called
    const handlerCalled = await page.evaluate(() => window.__statButtonClickCalled || false);
    console.log("App handler called:", handlerCalled);

    // Check state after click
    const afterClick = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return {
        disabled: btn.disabled,
        hasDisabledAttr: btn.hasAttribute("disabled"),
        hasDisabledClass: btn.classList.contains("disabled")
      };
    });
    console.log("After click:", JSON.stringify(afterClick, null, 2));
  });
});
