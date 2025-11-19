import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Debug FF overrides", () => {
  test("check if __FF_OVERRIDES actually works", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");
    
    // Check isEnabled BEFORE setting overrides
    const before = await page.evaluate(() => {
      const isEnabled = window.isEnabled || (() => false);
      return {
        opponentDelayMessage: isEnabled("opponentDelayMessage"),
        overridesExists: !!window.__FF_OVERRIDES
      };
    });
    console.log("BEFORE overrides:", before);
    
    // Set overrides
    await page.evaluate(() => {
      window.__FF_OVERRIDES = {
        opponentDelayMessage: true
      };
    });
    
    // Check AFTER setting overrides
    const after = await page.evaluate(() => {
      const isEnabled = window.isEnabled || (() => false);
      const overrides = window.__FF_OVERRIDES;
      return {
        opponentDelayMessage: isEnabled("opponentDelayMessage"),
        overridesExists: !!overrides,
        overridesValue: overrides,
        // Also check the actual code path
        hasOwnProperty: Object.prototype.hasOwnProperty.call(overrides || {}, "opponentDelayMessage"),
        overrideValue: overrides?.opponentDelayMessage,
        booleanValue: !!overrides?.opponentDelayMessage
      };
    });
    console.log("AFTER overrides:", after);
  });
});
