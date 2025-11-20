import { test as base, expect } from "@playwright/test";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForFeatureFlagOverrides } from "./helpers/featureFlagHelper.js";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  const test = base;
  test("shows snackbar after stat selection", async ({ page }) => {
    // Configure the app with opponentDelayMessage enabled and autoSelect disabled.
    // configureApp routes the settings fetch to inject these overrides, which survives
    // fixture initialization because it's applied at the fetch layer, not localStorage.
    const app = await configureApp(page, {
      featureFlags: {
        opponentDelayMessage: true,
        autoSelect: false
      }
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for stat buttons to be visible and ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    // Verify that opponentDelayMessage flag is enabled before driving the UI.
    // This ensures snackbar behavior is deterministic and not dependent on UI copy.
    await waitForFeatureFlagOverrides(page, {
      opponentDelayMessage: true
    });

    // Click a stat to trigger the opponent choosing state
    await firstStat.click();

    // Snackbar should show the opponent choosing message when opponentDelayMessage is enabled.
    // This message appears after stat selection because the flag enables the opponent delay UI.
    const snackbar = page.locator("#snackbar-container .snackbar");
    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i, {
      timeout: 5000
    });

    // Clean up the app configuration
    await app.cleanup();
  });
});
