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
  async function launchClassicBattle(page, featureFlags) {
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
    await waitForFeatureFlagOverrides(page, featureFlags);

    return {
      app,
      firstStat,
      statButtons,
      snackbar: page.locator("#snackbar-container .snackbar"),
      nextButton: page.getByTestId("next-button")
    };
  }

  async function measureSnackbarAppearance({
    firstStat,
    statButtons,
    snackbar,
    expectDeferred
  }) {
    const selectionStartedAt = Date.now();

    await firstStat.click();
    await expect(statButtons).toHaveAttribute("data-buttons-ready", "false");
    await expect(firstStat).toBeDisabled();

    if (expectDeferred) {
      await expect(snackbar).toBeHidden({ timeout: 350 });
    }

    await expect(snackbar).toContainText(/opponent is choosing/i, {
      timeout: expectDeferred ? 6000 : 1500
    });
    await expect(snackbar).toBeVisible();

    return Date.now() - selectionStartedAt;
  }

  test(
    `[Spec: ${FLAG_SPEC_PATH}] opponent choosing snackbar is deferred, shown, and cleared when flag is enabled`,
    async ({ page }) => {
      const { app, statButtons, snackbar, nextButton, firstStat } = await launchClassicBattle(page, {
        opponentDelayMessage: true
      });

      const visibleDelay = await measureSnackbarAppearance({
        firstStat,
        statButtons,
        snackbar,
        expectDeferred: true
      });

      expect(visibleDelay).toBeGreaterThanOrEqual(500);

      await expect(nextButton).toBeEnabled({ timeout: 10000 });
      await nextButton.click();

      await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
      await expect(snackbar).toBeHidden({ timeout: 5000 });

      await app.cleanup();
    }
  );

  test(
    `[Spec: ${FLAG_SPEC_PATH}] opponent choosing snackbar fires immediately when flag is disabled`,
    async ({ page }) => {
      const { app, statButtons, snackbar, nextButton, firstStat } = await launchClassicBattle(page, {
        opponentDelayMessage: false
      });

      const visibleDelay = await measureSnackbarAppearance({
        firstStat,
        statButtons,
        snackbar,
        expectDeferred: false
      });

      expect(visibleDelay).toBeLessThan(500);

      await expect(nextButton).toBeEnabled({ timeout: 2000 });
      await nextButton.click();

      await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
      await expect(snackbar).toBeHidden({ timeout: 5000 });

      await app.cleanup();
    }
  );
});
