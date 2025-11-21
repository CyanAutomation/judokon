import { test, expect } from "./fixtures/commonSetup.js";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForFeatureFlagOverrides } from "./helpers/featureFlagHelper.js";

/**
 * Feature Flag Override Pattern with commonSetup
 *
 * This test uses the commonSetup fixture combined with configureApp for feature flag overrides.
 * The commonSetup fixture provides:
 * - Common mocked routes (navigation, gameModes, etc.) needed for page load
 * - Browser logging and error capture
 * - localStorage initialization with enableTestMode
 *
 * configureApp provides:
 * - Route-based settings fetch override (operates at fetch layer, not localStorage)
 * - Feature flag injection that survives localStorage operations
 *
 * **Why this pattern works**:
 * 1. commonSetup fixture runs init scripts that set up enableTestMode in localStorage
 * 2. commonSetup registers common routes (navigation, gameModes, etc.)
 * 3. Test calls configureApp() to set up settings.json route override with feature flags
 * 4. When page.goto() is called, page loads with registered routes + feature flag override
 * 5. The route override happens at fetch layer (survives any localStorage mutations)
 *
 * **Initialization Order**:
 * - Fixture setup (enableTestMode + common routes) → configureApp (feature flag route) → page.goto()
 * - This order ensures all necessary routes are ready before navigation
 *
 * **See Also**:
 * - `playwright/fixtures/commonSetup.js` - Common fixture setup
 * - `playwright/fixtures/appConfig.js` - configureApp implementation
 * - `playwright/helpers/featureFlagHelper.js` - waitForFeatureFlagOverrides implementation
 */

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

    // Navigate to battle page
    // Note: Using "networkidle" instead of "load" since the app may have deferred loading
    await page.goto("/src/pages/battleClassic.html", { 
      waitUntil: "networkidle",
      timeout: 15000 
    });

    // Wait for stat buttons to be visible and ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });

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
