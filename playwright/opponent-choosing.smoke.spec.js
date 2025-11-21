import { test as base, expect } from "@playwright/test";
import { configureApp } from "./fixtures/appConfig.js";
import { registerCommonRoutes } from "./fixtures/commonRoutes.js";
import { waitForFeatureFlagOverrides } from "./helpers/featureFlagHelper.js";

/**
 * Feature Flag Override Pattern for Smoke Tests
 *
 * This test uses base Playwright test with manual route registration and configureApp.
 *
 * **Why NOT use commonSetup fixture?**
 * The commonSetup fixture runs multiple init scripts that can conflict with route-based
 * feature flag overrides from configureApp:
 * - Fixture's addInitScript for enableTestMode runs BEFORE test code
 * - test's configureApp route setup runs in test code (AFTER fixture construction)
 * - When page.goto() is called, init scripts have already run but route hasn't been set up yet
 * - This timing mismatch can cause page load issues or feature flag interference
 *
 * **Why this pattern works:**
 * 1. Base test provides minimal fixture overhead
 * 2. configureApp(page, {...}) sets up route override BEFORE page.goto()
 * 3. registerCommonRoutes(page) provides mocked routes needed for page load
 * 4. When page loads, settings.json fetch is intercepted with feature flag overrides
 * 5. No competing init scripts means no timing conflicts
 *
 * **Pattern:**
 * - Use base Playwright test (not commonSetup)
 * - Call registerCommonRoutes(page) to set up mocked routes
 * - Call configureApp(page, {...}) to set up feature flag overrides
 * - Call page.goto() after both setup steps
 *
 * **See Also:**
 * - `playwright/fixtures/appConfig.js` - configureApp implementation
 * - `playwright/fixtures/commonRoutes.js` - registerCommonRoutes implementation
 * - `playwright/helpers/featureFlagHelper.js` - waitForFeatureFlagOverrides implementation
 */
const test = base;

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    // Register common routes needed for page load (navigation, gameModes, etc.)
    await registerCommonRoutes(page);

    // Configure the app with opponentDelayMessage enabled and autoSelect disabled.
    // configureApp routes the settings fetch to inject these overrides, which survives
    // route registration because it's applied at the fetch layer, not localStorage.
    const app = await configureApp(page, {
      featureFlags: {
        opponentDelayMessage: true,
        autoSelect: false
      }
    });

    // Navigate to battle page
    // Note: Using "networkidle" instead of "load" since the app may have deferred loading
    await page.goto("/src/pages/battleClassic.html", {
      waitUntil: "networkidle",
      timeout: 15000
    });

    // Wait for stat buttons to be visible and ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true", {
      timeout: 5000
    });

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
