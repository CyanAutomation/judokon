/**
 * Playwright test setup that automatically registers common routes.
 *
 * @pseudocode
 * 1. Import base test and expect from Playwright.
 * 2. Import registerCommonRoutes helper.
 * 3. Extend the base test's page fixture to:
 *    a. Clear localStorage and enable test-mode settings.
 *    b. Remove unexpected modal backdrops once after DOMContentLoaded.
 *    c. Register common routes.
 * 4. Export the extended test and expect.
 */
import { test as base, expect } from "@playwright/test";
import { registerCommonRoutes } from "./commonRoutes.js";

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
    page.on("pageerror", (err) => {
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

    await page.addInitScript(() => {
      localStorage.clear();
      // Reset snackbar override between tests so snackbar-based assertions remain deterministic
      try {
        delete window.__disableSnackbars;
      } catch {}
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: true } } })
      );
    });
    await page.addInitScript(() => {
      // Remove only hidden/inactive modal backdrops once DOM is ready to
      // prevent stray overlays from interfering, but keep the round-select
      // dialog even if it hasn't called open() yet.
      document.addEventListener(
        "DOMContentLoaded",
        () =>
          document.querySelectorAll(".modal-backdrop[hidden]").forEach((el) => {
            const isRoundSelect =
              el.querySelector(".round-select-buttons") || el.querySelector("#round-select-title");
            if (!isRoundSelect) el.remove();
          }),
        { once: true }
      );
    });
    await registerCommonRoutes(page);
    await use(page);
  }
});

export { expect };