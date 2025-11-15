import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Button State Timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };

      // Hook into button state changes
      window.__buttonTimeline = [];
      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(...args) {
        if (this.dataset?.testid === 'stat-button' && args[0] === 'disabled') {
          window.__buttonTimeline.push({
            time: Date.now(),
            action: 'setAttribute disabled',
            stack: new Error().stack.split('\n').slice(2, 5).join('\n')
          });
        }
        return originalSetAttribute.apply(this, args);
      };

      const originalRemoveAttribute = Element.prototype.removeAttribute;
      Element.prototype.removeAttribute = function(...args) {
        if (this.dataset?.testid === 'stat-button' && args[0] === 'disabled') {
          window.__buttonTimeline.push({
            time: Date.now(),
            action: 'removeAttribute disabled',
            stack: new Error().stack.split('\n').slice(2, 5).join('\n')
          });
        }
        return originalRemoveAttribute.apply(this, args);
      };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();
  });

  test("track button disabled state timeline", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Clear timeline before click
    await page.evaluate(() => {
      window.__buttonTimeline = [];
    });

    // Click the button
    await statButtons.first().click();

    await page.waitForTimeout(100);

    // Get the timeline
    const timeline = await page.evaluate(() => window.__buttonTimeline || []);
    console.log("Button state timeline:");
    timeline.forEach((entry, i) => {
      console.log(`${i}: ${entry.action}`);
      console.log(entry.stack);
      console.log('---');
    });

    // Check final state
    const finalDisabled = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return btn ? btn.disabled : null;
    });
    console.log("Final button disabled state:", finalDisabled);
  });
});
