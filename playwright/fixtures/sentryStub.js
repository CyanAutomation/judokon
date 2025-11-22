/**
 * Provide a lightweight Sentry stub for Playwright tests.
 *
 * @pseudocode
 * 1. Install a global Sentry stand-in before app scripts execute.
 * 2. Offer no-op implementations for the methods used by sentryReporter.
 * 3. Keep hub-related getters defined so classic battle state handlers skip dynamic imports.
 *
 * @param {import('@playwright/test').Page} page - Playwright page.
 * @returns {Promise<void>} Resolves after the init script is registered.
 */
export async function installSentryStub(page) {
  await page.addInitScript(() => {
    const scope = typeof globalThis !== "undefined" ? globalThis : window;
    const hub = {
      getClient: () => ({ id: "sentry-stub" })
    };
    const noop = () => {};
    const withScope = (cb) => {
      if (typeof cb === "function") {
        try {
          cb({ setTag: noop, setExtra: noop, setContext: noop });
        } catch (error) {
          console.warn("[sentry-stub] scope callback failed", error);
        }
      }
    };
    const configureScope = withScope;
    const stub = {
      captureException: noop,
      withScope,
      configureScope,
      getCurrentHub: () => hub,
      getHubFromCarrier: () => hub,
      addBreadcrumb: noop,
      init: noop,
      isInitialized: () => true
    };

    if (!scope.Sentry) {
      scope.Sentry = stub;
    } else {
      const existing = scope.Sentry;
      for (const key of Object.keys(stub)) {
        if (typeof existing[key] === "undefined") {
          existing[key] = stub[key];
        }
      }
    }
  });
}
