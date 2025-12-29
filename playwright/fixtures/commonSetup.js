/**
 * Playwright test setup that automatically registers common routes and preserves feature flag overrides.
 *
 * @pseudocode
 * 1. Import base test and expect from Playwright.
 * 2. Import registerCommonRoutes helper.
 * 3. Extend the base test's page fixture to:
 *    a. Clear localStorage and enable test-mode settings, while preserving any existing feature flags.
 *    b. Remove unexpected modal backdrops once after DOMContentLoaded.
 *    c. Register common routes.
 * 4. Export the extended test and expect.
 *
 * **Feature Flag Preservation**:
 * - If a test's setup code (e.g., `configureApp`) has already set feature flags in localStorage,
 *   this fixture will merge them with its base settings rather than overwriting them.
 * - This allows tests using `configureApp` for route-based overrides to also benefit from the
 *   fixture's common route setup and browser logging without losing feature flag state.
 * - The fixture always ensures `enableTestMode` is set to `true`, even if it was previously false.
 *
 * **Compatibility**:
 * - Works with tests that do NOT use feature flag overrides (existing behavior preserved).
 * - Works with tests that DO use `configureApp` with feature flag overrides (new behavior).
 * - Can be extended in the future to support callback-based feature flag injection.
 */

import { test as base, expect } from "@playwright/test";
import { registerCommonRoutes } from "./commonRoutes.js";
import { installSentryStub } from "./sentryStub.js";

const showLogsInBrowser =
  typeof process !== "undefined" && !!process.env && !!process.env.SHOW_TEST_LOGS;

// Set global flag at module level so logger can detect Playwright context
// before page initialization and browser context setup
if (typeof globalThis !== "undefined") {
  globalThis.__PLAYWRIGHT_TEST__ = true;
  if (showLogsInBrowser) {
    globalThis.__SHOW_TEST_LOGS__ = true;
  }
}

export const test = base.extend({
  /** @type {import('@playwright/test').Page} */
  page: async ({ page }, use) => {
    // Surface browser-side warnings and errors in test output for debugging
    page.on("console", (msg) => {
      const type = msg.type();
      if (type !== "warning" && type !== "error") return;
      // Filter out known noisy, low-signal messages to keep CI logs readable.
      const text = msg.text();
      const isNoisyResource404 =
        /Failed to load resource: the server responded with a status of 404/i.test(text);
      const isBenignCountryMapping = /countryCodeMapping\.json/i.test(text);
      // These appear when fetches are aborted or mocked and the app falls back to import()
      const isBenignNavFallback =
        /Failed to fetch (navigation items|game modes), falling back to import/i.test(text);
      if (isNoisyResource404 || isBenignCountryMapping || isBenignNavFallback) return;
      try {
        // console.log(`[browser:${type}]`, text);
      } catch {}
    });
    page.on("pageerror", () => {
      try {
        // console.log(`[pageerror] ${err?.message || err}`);
        // if (err?.stack) console.log(err.stack);
      } catch {}
    });
    page.on("requestfailed", (req) => {
      try {
        const f = req.failure();
        const url = req.url();
        const err = f?.errorText || "";
        // Ignore benign aborts and static assets to keep logs useful
        const isAborted = err.includes("ERR_ABORTED");
        const isStatic = /\.(png|jpg|jpeg|svg|ico|woff2?|css)$/i.test(url);
        if (isAborted || isStatic) return;
        // console.log(`[requestfailed] ${req.method()} ${url} ${err}`);
      } catch {}
    });

    await page.addInitScript((shouldShowLogs) => {
      window.__PLAYWRIGHT_TEST__ = true;
      try {
        globalThis.__PLAYWRIGHT_TEST__ = true;
      } catch {}
      if (!shouldShowLogs) return;
      try {
        window.__SHOW_TEST_LOGS__ = true;
      } catch {}
      try {
        globalThis.__SHOW_TEST_LOGS__ = true;
      } catch {}
    }, showLogsInBrowser);
    await page.addInitScript(() => {
      // Reset snackbar override between tests so snackbar-based assertions remain deterministic
      try {
        delete window.__disableSnackbars;
      } catch {}

      // Helper to perform deep merge of settings objects
      const mergeSettings = (base, overrides) => {
        if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
          return base;
        }
        const result = { ...base };
        for (const [key, value] of Object.entries(overrides)) {
          if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            result[key] &&
            typeof result[key] === "object" &&
            !Array.isArray(result[key])
          ) {
            result[key] = mergeSettings(result[key], value);
          } else {
            result[key] = value;
          }
        }
        return result;
      };

      // Read existing settings from localStorage BEFORE clearing
      // (tests may have pre-populated this via route overrides or previous operations)
      let existingSettings = {};
      try {
        const stored = localStorage.getItem("settings");
        if (stored) {
          existingSettings = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("[commonSetup] Failed to parse existing settings:", e);
      }

      // Only clear localStorage if there are no significant feature flags already set
      // (Preserve route-based overrides that may have been pre-configured by tests)
      const hasExistingFlags =
        existingSettings?.featureFlags &&
        Object.keys(existingSettings.featureFlags).some((key) => key !== "enableTestMode");

      if (!hasExistingFlags) {
        // No pre-configured feature flags; safe to clear
        localStorage.clear();
      } else {
        // Pre-configured flags exist; preserve them
        // Also preserve battle configuration keys (e.g., pointsToWin)
        try {
          const parsed = existingSettings;
          const battlePointsToWin = localStorage.getItem("battle.pointsToWin");
          localStorage.clear();
          localStorage.setItem("settings", JSON.stringify(parsed));
          if (battlePointsToWin !== null) {
            localStorage.setItem("battle.pointsToWin", battlePointsToWin);
          }
        } catch (e) {
          console.warn("[commonSetup] Failed to preserve settings:", e);
        }
      }

      // Base settings provided by fixture: enableTestMode + any existing feature flags
      const baseSettings = {
        featureFlags: {
          enableTestMode: { enabled: true }
        }
      };

      // Read again in case we just cleared and reset
      let currentSettings = {};
      try {
        const stored = localStorage.getItem("settings");
        if (stored) {
          currentSettings = JSON.parse(stored);
        }
      } catch (e) {
        console.warn("[commonSetup] Failed to read settings after clear:", e);
      }

      // Merge: preserve existing feature flags while ensuring enableTestMode is set
      const mergedSettings = mergeSettings(currentSettings, baseSettings);

      // Ensure enableTestMode.enabled is explicitly true (overriding any false value)
      if (!mergedSettings.featureFlags) {
        mergedSettings.featureFlags = {};
      }
      mergedSettings.featureFlags.enableTestMode = { enabled: true };

      try {
        localStorage.setItem("settings", JSON.stringify(mergedSettings));
      } catch (e) {
        console.warn("[commonSetup] Failed to set merged settings:", e);
      }
    });
    await page.addInitScript(() => {
      // Remove only hidden/inactive dialogs once DOM is ready to
      // prevent stray overlays from interfering, but keep the round-select
      // dialog even if it hasn't called open() yet.
      document.addEventListener(
        "DOMContentLoaded",
        () =>
          document.querySelectorAll("dialog.modal:not([open])").forEach((el) => {
            const isRoundSelect =
              el.querySelector(".round-select-buttons") || el.querySelector("#round-select-title");
            if (!isRoundSelect) el.remove();
          }),
        { once: true }
      );
    });
    await installSentryStub(page);
    await registerCommonRoutes(page);
    await use(page);
  }
});

export { expect };
