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
const FLAG_SPEC_PATH = "docs/qa/opponent-delay-message.md";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  async function bootClassicBattle(page, featureFlags) {
    await registerCommonRoutes(page);

    const app = await configureApp(page, {
      featureFlags: {
        autoSelect: false,
        ...featureFlags
      }
    });

    await page.goto("/src/pages/battleClassic.html", {
      waitUntil: "networkidle",
      timeout: 15000
    });

    const statButtons = page.locator("#stat-buttons");
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible({ timeout: 5000 });
    await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });

    return {
      app,
      firstStat,
      statButtons,
      snackbar: page.locator("#snackbar-container .snackbar"),
      nextButton: page.getByTestId("next-button")
    };
  }

  test("delays and clears the snackbar when the flag is enabled (spec: " + FLAG_SPEC_PATH + ")", async ({
    page
  }) => {
    const { app, firstStat, statButtons, snackbar, nextButton } = await bootClassicBattle(page, {
      opponentDelayMessage: true
    });

    await waitForFeatureFlagOverrides(page, {
      opponentDelayMessage: true
    });

    await firstStat.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "false");
    await expect(firstStat).toBeDisabled();

    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i, {
      timeout: 6000
    });

    await expect(nextButton).toBeEnabled({ timeout: 10000 });
    await nextButton.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
    await expect(snackbar).toBeHidden({ timeout: 5000 });

    await app.cleanup();
  });

  test("shows immediate snackbar when flag is disabled (spec fallback: " + FLAG_SPEC_PATH + ")", async ({
    page
  }) => {
    const { app, firstStat, statButtons, snackbar, nextButton } = await bootClassicBattle(page, {
      opponentDelayMessage: false
    });

    await waitForFeatureFlagOverrides(page, {
      opponentDelayMessage: false
    });

    await firstStat.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "false");
    // When flag is disabled, snackbar should appear immediately with shorter timeout
    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i, {
      timeout: 1000
    });

    // Next button should be enabled immediately without delay when flag is disabled
    await expect(nextButton).toBeEnabled({ timeout: 2000 });
    await nextButton.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
    await expect(snackbar).toBeHidden({ timeout: 5000 });

    await app.cleanup();
  });
});
