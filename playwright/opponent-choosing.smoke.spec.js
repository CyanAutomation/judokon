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
    // Reset EventTarget/WeakSet BEFORE any page scripts load
    // This must run before registerCommonRoutes and configureApp
    await page.addInitScript(() => {
      // Clear WeakSet that tracks bound targets
      delete globalThis.__cbUIHelpersDynamicBoundTargets;
      
      // Clear EventTarget singleton
      delete globalThis.__classicBattleEventTarget;
    });

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

    // Verify EventTarget and handler registration (diagnostic)
    const diagnostics = await page.evaluate(() => {
      const target = globalThis.__classicBattleEventTarget;
      const weakSet = globalThis.__cbUIHelpersDynamicBoundTargets;

      // Test if emitting an event works
      let eventFired = false;
      if (target) {
        target.addEventListener("testEvent", () => {
          eventFired = true;
        });
        target.dispatchEvent(new CustomEvent("testEvent", { detail: {} }));
      }

      return {
        targetExists: !!target,
        targetDebugId: target?.__debugId || "NO_ID",
        targetCreatedAt: target?.__createdAt || "NO_TIMESTAMP",
        weakSetExists: !!weakSet,
        targetInWeakSet: weakSet && target ? weakSet.has(target) : false,
        eventSystemWorks: eventFired
      };
    });

    // Log diagnostics for debugging test failures
    console.log("[Test Diagnostics]", {
      featureFlags,
      ...diagnostics
    });

    // Verify critical state
    if (!diagnostics.targetExists) {
      throw new Error("EventTarget not created - initialization may have failed");
    }
    if (!diagnostics.targetInWeakSet) {
      throw new Error("EventTarget not in WeakSet - handlers may not be registered");
    }
    if (!diagnostics.eventSystemWorks) {
      throw new Error("EventTarget dispatching doesn't work - event system broken");
    }

    // Add a test listener to verify statSelected events are being emitted
    await page.evaluate(() => {
      const target = globalThis.__classicBattleEventTarget;
      if (target) {
        window.__statSelectedEventCount = 0;
        window.__eventTargetAtRegistration = target.__debugId;
        target.addEventListener("statSelected", (e) => {
          window.__statSelectedEventCount++;
          console.log("[Test Listener] statSelected event fired!", {
            count: window.__statSelectedEventCount,
            targetId: target.__debugId,
            detail: e.detail
          });
        });
        
        // Intercept emitBattleEvent to track which target is used for emission
        const originalGetTarget = window.__classicBattleEventTarget;
        window.__emitTargetIds = [];
      }
    });

    return {
      app,
      firstStat,
      statButtons,
      snackbar: page.locator("#snackbar-container .snackbar-bottom"),
      nextButton: page.getByTestId("next-button")
    };
  }

  async function measureSnackbarAppearance({ firstStat, statButtons, snackbar, expectDeferred }) {
    const selectionStartedAt = Date.now();

    await firstStat.click();
    await expect(statButtons).toHaveAttribute("data-buttons-ready", "false");
    await expect(firstStat).toBeDisabled();

    if (expectDeferred) {
      await expect(snackbar).toBeHidden({ timeout: 450 });
    }

    await expect(snackbar).toContainText(/opponent is choosing/i, {
      timeout: expectDeferred ? 6000 : 1500
    });
    await expect(snackbar).toBeVisible();

    return Date.now() - selectionStartedAt;
  }

  test(`[Spec: ${FLAG_SPEC_PATH}] opponent choosing snackbar is deferred, shown, and cleared when flag is enabled`, async ({
    page
  }) => {
    const { app, statButtons, snackbar, nextButton, firstStat } = await launchClassicBattle(page, {
      opponentDelayMessage: true
    });

    const visibleDelay = await measureSnackbarAppearance({
      firstStat,
      statButtons,
      snackbar,
      expectDeferred: true
    });

    expect(visibleDelay).toBeGreaterThanOrEqual(400);

    await expect(nextButton).toBeEnabled({ timeout: 10000 });
    await nextButton.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
    await expect(snackbar).toBeHidden({ timeout: 5000 });

    await app.cleanup();
  });

  test(`[Spec: ${FLAG_SPEC_PATH}] opponent choosing snackbar fires immediately when flag is disabled`, async ({
    page
  }) => {
    const { app, statButtons, snackbar, nextButton, firstStat } = await launchClassicBattle(page, {
      opponentDelayMessage: false
    });

    const visibleDelay = await measureSnackbarAppearance({
      firstStat,
      statButtons,
      snackbar,
      expectDeferred: false
    });

    expect(visibleDelay).toBeLessThan(600);

    await expect(nextButton).toBeEnabled({ timeout: 2000 });
    await nextButton.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
    await expect(snackbar).toBeHidden({ timeout: 5000 });

    await app.cleanup();
  });
});
