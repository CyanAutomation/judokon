import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Debug isEnabled function", () => {
  test("check if isEnabled function is correctly bound", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");
    
    // Set overrides
    await page.evaluate(() => {
      window.__FF_OVERRIDES = {
        opponentDelayMessage: true
      };
    });
    
    // Manually execute the isEnabled logic inline to see if it works
    const manualCheck = await page.evaluate(() => {
      const flag = "opponentDelayMessage";
      const w = typeof window !== "undefined" ? window : null;
      const o = w && w.__FF_OVERRIDES;
      const hasFlag = o && Object.prototype.hasOwnProperty.call(o, flag);
      const flagValue = o?.[flag];
      const boolResult = !!o?.[flag];
      
      // Also call the actual isEnabled function
      const isEnabled = window.isEnabled || (() => "MISSING");
      const actualResult = isEnabled("opponentDelayMessage");
      
      return {
        hasFlag,
        flagValue,
        boolResult,
        actualResult,
        isEnabledExists: !!window.isEnabled,
        isEnabledType: typeof window.isEnabled
      };
    });
    console.log("Manual check:", manualCheck);
  });
});
