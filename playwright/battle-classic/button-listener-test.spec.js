import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Button Listener Test", () => {
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

  test("check if click listeners are attached", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Check if buttons have click listeners
    const hasListeners = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      if (!btn) return { error: "Button not found" };

      // Try to detect if there are event listeners
      // This is tricky as JavaScript doesn't expose listeners directly
      // Let's try adding our own listener and clicking
      let ourListenerCalled = false;
      btn.addEventListener('click', () => {
        ourListenerCalled = true;
        console.log("Our test listener called!");
      });

      // Manually dispatch a click event
      btn.click();

      return {
        ourListenerCalled,
        buttonExists: true,
        buttonDisabled: btn.disabled,
        buttonType: btn.type,
        buttonTagName: btn.tagName
      };
    });

    console.log("Listener test results:", JSON.stringify(hasListeners, null, 2));

    // Check the global flag
    await page.waitForTimeout(50);
    const clickHandlerCalled = await page.evaluate(() => window.__statButtonClickCalled || false);
    console.log("App's click handler called:", clickHandlerCalled);
  });
});
