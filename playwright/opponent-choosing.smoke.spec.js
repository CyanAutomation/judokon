import { test as base, expect } from "@playwright/test";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForFeatureFlagOverrides } from "./helpers/featureFlagHelper.js";

/**
 * Fixture Usage Pattern for Feature Flag Overrides
 *
 * This test demonstrates the recommended pattern for overriding feature flags in Playwright tests:
 *
 * **Why use base Playwright test instead of `commonSetup`?**
 * - The `commonSetup` fixture runs init scripts that execute BEFORE `configureApp` can set up
 *   its route override. Since init scripts run during fixture setup (before test code), any
 *   localStorage operations by the fixture may interfere with route interception timing.
 * - The route interception in `configureApp` is more robust when tests avoid competing
 *   localStorage mutations during the fixture initialization phase.
 * - For feature flag overrides, use `configureApp` with the base test.
 * - For common routes and browser logging, use `registerCommonRoutes` directly in the test
 *   if needed (currently not required for smoke test).
 *
 * **Pattern**: Use base Playwright test + `configureApp`
 * 1. Import base test from `@playwright/test` (or use fixtures/commonSetup only if needed)
 * 2. Call `configureApp(page, { featureFlags: { ... } })` FIRST in the test
 * 3. Use `waitForFeatureFlagOverrides()` to verify flags are set
 * 4. Proceed with page navigation and UI testing
 * 5. Call `await app.cleanup()` in test teardown
 *
 * **Why this works**:
 * - `configureApp` sets up a route override BEFORE page.goto() is called
 * - When the app loads and calls `fetch('/src/data/settings.json')`, the route intercepts it
 * - The mocked response includes your feature flag overrides at the fetch layer
 * - This approach survives localStorage mutations because it operates at protocol level
 *
 * **Benefits**:
 * - ✅ Survives route registration with minimal fixture interference
 * - ✅ Proven pattern used across multiple tests in the codebase
 * - ✅ Works reliably without complex fixture choreography
 * - ✅ Can be combined with other `configureApp` options
 *
 * **Future enhancement**: commonSetup fixture will be enhanced to work seamlessly with
 * `configureApp` once fixture init script ordering is addressed.
 *
 * **See Also**:
 * - `playwright/fixtures/appConfig.js` - Implementation of configureApp helper
 * - `playwright/helpers/featureFlagHelper.js` - waitForFeatureFlagOverrides implementation
 * - `playwright/stat-hotkeys.smoke.spec.js` - Another example of this pattern
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

    // Note: We assert on the feature flag state (source of truth) rather than the opponent
    // delay value itself, since the flag enables the UI behavior. This makes the test robust
    // to internal implementation changes while validating that the feature is configured.

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
