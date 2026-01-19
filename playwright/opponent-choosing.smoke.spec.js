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
      testMode: "disable", // Disable test mode so snackbars work
      featureFlags: {
        autoSelect: false,
        ...featureFlags
      }
    });

    // Set opponent resolve delay BEFORE page loads
    // The delay must be longer than the snackbar appearance delay (500ms)
    await page.addInitScript(() => {
      window.__OPPONENT_RESOLVE_DELAY_MS = 1500;
      window.__NEXT_ROUND_COOLDOWN_MS = 0; // No cooldown so snackbar clears immediately
    });

    await page.goto("/src/pages/battleClassic.html", {
      waitUntil: "networkidle",
      timeout: 15000
    });

    // Wait for full initialization including handler registration
    await page.waitForFunction(
      () => {
        return (
          window.__battleDiagnostics?.initComplete === true &&
          window.__battleDiagnostics?.handlersRegistered === true
        );
      },
      { timeout: 10000 }
    );

    await page.waitForFunction(() => Boolean(globalThis.__classicBattleEventTarget), {
      timeout: 10000
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
      snackbar: page.locator("#snackbar-container .snackbar-bottom"),
      nextButton: page.getByTestId("next-button")
    };
  }

  async function waitForBattleEvent(page, eventName, timeoutMs = 8000) {
    return page.evaluate(
      ({ eventName: name, timeoutMs: timeout }) => {
        return new Promise((resolve, reject) => {
          const target = globalThis.__classicBattleEventTarget;
          if (!target) {
            reject(new Error("Classic battle event target not available."));
            return;
          }
          let settled = false;
          const handler = (event) => {
            if (settled) return;
            settled = true;
            target.removeEventListener(name, handler);
            resolve({ detail: event?.detail ?? null });
          };
          target.addEventListener(name, handler);
          if (Number.isFinite(timeout) && timeout > 0) {
            setTimeout(() => {
              if (settled) return;
              settled = true;
              target.removeEventListener(name, handler);
              reject(new Error(`Timed out waiting for battle event: ${name}`));
            }, timeout);
          }
        });
      },
      { eventName, timeoutMs }
    );
  }

  async function confirmOpponentPrompt({ page, firstStat, statButtons, snackbar, expectDeferred }) {
    const promptReady = waitForBattleEvent(page, "opponentPromptReady");

    await firstStat.click();
    await expect(statButtons).toHaveAttribute("data-buttons-ready", "false");
    await expect(statButtons).toHaveAttribute("data-selection-in-progress", "true");
    await expect(firstStat).toBeDisabled();

    if (expectDeferred) {
      await expect(snackbar).toBeHidden();
    }

    await promptReady;

    await expect(snackbar).toContainText(/opponent is choosing/i);
    await expect(snackbar).toBeVisible();
  }

  test(`[Spec: ${FLAG_SPEC_PATH}] opponent choosing snackbar is deferred, shown, and cleared when flag is enabled`, async ({
    page
  }) => {
    // SKIP REASON: Snackbar DOM element not appearing despite handler execution
    // ROOT CAUSE INVESTIGATION: See TEST_FAILURE_ANALYSIS.md Task 3
    // - ✅ Handler registration confirmed working
    // - ✅ Event emission confirmed working
    // - ✅ Handler execution confirmed working
    // - ❌ Snackbar DOM element not created/visible (separate bug)
    // TRACKING: See TEST_FAILURE_ANALYSIS.md
    // VERIFIED: Initialization synchronization (window.__battleDiagnostics) works correctly
    // TODO: Investigate snackbar display bug separately from initialization issue
    const { app, statButtons, snackbar, nextButton, firstStat } = await launchClassicBattle(page, {
      opponentDelayMessage: true
    });

    await confirmOpponentPrompt({
      page,
      firstStat,
      statButtons,
      snackbar,
      expectDeferred: true
    });

    await expect(nextButton).toBeEnabled({ timeout: 10000 });
    await nextButton.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
    await expect(snackbar).toBeHidden({ timeout: 5000 });

    await app.cleanup();
  });

  test(`[Spec: ${FLAG_SPEC_PATH}] opponent choosing snackbar fires immediately when flag is disabled`, async ({
    page
  }) => {
    // SKIP REASON: Same snackbar display issue as above test
    // See TEST_FAILURE_ANALYSIS.md Task 3 for full investigation
    const { app, statButtons, snackbar, nextButton, firstStat } = await launchClassicBattle(page, {
      opponentDelayMessage: false
    });

    await confirmOpponentPrompt({
      page,
      firstStat,
      statButtons,
      snackbar,
      expectDeferred: false
    });

    await expect(nextButton).toBeEnabled({ timeout: 2000 });
    await nextButton.click();

    await expect(statButtons).toHaveAttribute("data-buttons-ready", "true", { timeout: 5000 });
    await expect(snackbar).toBeHidden({ timeout: 5000 });

    await app.cleanup();
  });
});
