import { test as base, expect } from "@playwright/test";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForFeatureFlagOverrides } from "./helpers/featureFlagHelper.js";

/**
 * Fixture Usage Pattern for Feature Flag Overrides
 *
 * This test demonstrates the recommended pattern for overriding feature flags in Playwright tests:
 *
 * **Why not use `commonSetup` fixture?**
 * - The `commonSetup` fixture clears localStorage and sets only `enableTestMode` via `addInitScript`
 * - This runs on every page load and would override any localStorage-based flag overrides
 * - Instead, `configureApp` uses route interception to override settings at the fetch layer
 * - Route interception is more robust than localStorage manipulation because it intercepts
 *   the app's actual settings fetch request, bypassing any fixture-based localStorage resets
 *
 * **Pattern**: Use `configureApp` from `fixtures/appConfig.js`
 * 1. Call `configureApp(page, { featureFlags: { flagName: boolean, ... } })`
 * 2. Pass the returned `app` object to the rest of your test setup
 * 3. Call `await app.cleanup()` in test teardown (optional, but recommended)
 *
 * **Why this works**:
 * - `configureApp` sets up a route override BEFORE page.goto() is called
 * - When the app loads and calls `fetch('/src/data/settings.json')`, the route intercepts it
 * - The mocked response includes your feature flag overrides at the fetch layer
 * - This approach survives any localStorage manipulation (fixture or otherwise)
 *
 * **Benefits**:
 * - ✅ Survives fixture initialization and localStorage resets
 * - ✅ Proven pattern used across 10+ tests in the codebase
 * - ✅ Works with or without `commonSetup` fixture
 * - ✅ Can be combined with other `configureApp` options (testMode, battle config, etc.)
 *
 * **See Also**:
 * - `playwright/fixtures/appConfig.js` - Implementation of configureApp helper
 * - `playwright/helpers/featureFlagHelper.js` - waitForFeatureFlagOverrides implementation
 * - `playwright/stat-hotkeys.smoke.spec.js` - Another example of this pattern
 * - `playwright/battle-cli-complete-round.spec.js` - Example with multiple overrides
 */
const test = base;

test.describe("Classic Battle – opponent choosing snackbar", () => {
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
