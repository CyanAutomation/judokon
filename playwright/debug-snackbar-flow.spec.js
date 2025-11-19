import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Debug snackbar flow", () => {
  test("check if opponent message code path executes", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem(
        "settings",
        JSON.stringify({
          featureFlags: {
            enableTestMode: { enabled: true },
            autoSelect: { enabled: false },
            opponentDelayMessage: { enabled: true }
          }
        })
      );

      // Instrument showSnackbar to track calls
      window.__snackbarCalls = [];
      window.addEventListener("DOMContentLoaded", () => {
        const originalShowSnackbar = window.showSnackbar;
        if (originalShowSnackbar) {
          window.showSnackbar = function (...args) {
            window.__snackbarCalls.push({ args, timestamp: Date.now() });
            return originalShowSnackbar.apply(this, args);
          };
        }
      });
    });

    await page.goto("/src/pages/battleClassic.html");

    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    // Click the button
    await firstStat.click();
    await page.waitForTimeout(500);

    // Check what snackbar calls were made
    const snackbarCalls = await page.evaluate(() => window.__snackbarCalls || []);
    console.log("Snackbar calls:", JSON.stringify(snackbarCalls, null, 2));

    // Check feature flag value
    const featureFlagCheck = await page.evaluate(() => {
      const isEnabled = window.isEnabled || (() => false);
      return {
        opponentDelayMessageEnabled: isEnabled("opponentDelayMessage"),
        autoSelectEnabled: isEnabled("autoSelect"),
        localStorage: localStorage.getItem("settings")
      };
    });
    console.log("Feature flags:", JSON.stringify(featureFlagCheck, null, 2));
  });
});
