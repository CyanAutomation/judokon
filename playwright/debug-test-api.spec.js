import { test, expect } from "./fixtures/commonSetup.js";

test("Debug Test API exposure on battle page", async ({ page }) => {
  console.log("\n=== Starting Test API Debug ===\n");

  await page.goto("/index.html");

  // Check if Test API is available on index page
  const indexApi = await page.evaluate(() => ({
    testApi: typeof window.__TEST_API !== "undefined",
    playwrightTest: window.__PLAYWRIGHT_TEST__,
    location: window.location.href,
    userAgent: navigator.userAgent,
    settings: localStorage.getItem("settings")
  }));
  console.log("Index page state:", JSON.stringify(indexApi, null, 2));

  // Navigate to Classic Battle
  const startBtn = await page.getByText("Classic Battle").first();
  await startBtn.click();

  // Wait for navigation to complete
  await page.waitForLoadState("networkidle");

  // Check current URL
  const url = await page.url();
  console.log("Current URL after navigation:", url);

  // Check if bootstrap script is loaded
  const pageState = await page.evaluate(() => ({
    testApi: typeof window.__TEST_API !== "undefined",
    initApi: typeof window.__TEST_API?.init !== "undefined",
    waitForBattleReady: typeof window.__TEST_API?.init?.waitForBattleReady,
    playwrightTest: window.__PLAYWRIGHT_TEST__,
    location: window.location.href,
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    battleStore: typeof window.battleStore !== "undefined",
    battleReadyPromise: typeof window.battleReadyPromise !== "undefined",
    initCalled: window.__initCalled,
    settings: localStorage.getItem("settings"),
    body: document.body?.dataset?.battleState,
    scripts: Array.from(document.scripts).map((s) => ({
      src: s.src,
      type: s.type,
      loaded: s.src ? true : false
    }))
  }));

  console.log("\nBattle page state:", JSON.stringify(pageState, null, 2));

  // Check if isTestMode would return true
  const testModeChecks = await page.evaluate(() => {
    const checks = {
      processEnv:
        typeof process !== "undefined"
          ? {
              NODE_ENV: process.env?.NODE_ENV,
              VITEST: process.env?.VITEST
            }
          : null,
      windowFlags: {
        __TEST__: typeof window.__TEST__ !== "undefined",
        __PLAYWRIGHT_TEST__: typeof window.__PLAYWRIGHT_TEST__ !== "undefined"
      },
      location: {
        href: window.location.href,
        hasLocalhost: window.location.href.includes("localhost"),
        has127: window.location.href.includes("127.0.0.1")
      },
      navigator: {
        webdriver: navigator.webdriver
      }
    };
    return checks;
  });

  console.log("\nTest mode detection checks:", JSON.stringify(testModeChecks, null, 2));

  // Force expose Test API if needed
  const exposeResult = await page.evaluate(async () => {
    try {
      // Try to manually call exposeClassicBattleTestAPI
      const mod = await import("../src/helpers/testing/exposeClassicBattleTestApi.js");
      await mod.exposeClassicBattleTestAPI();
      return {
        success: true,
        testApiNow: typeof window.__TEST_API !== "undefined"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log("\nManual expose result:", JSON.stringify(exposeResult, null, 2));

  // Final check
  const finalState = await page.evaluate(() => ({
    testApi: typeof window.__TEST_API !== "undefined",
    initApi: typeof window.__TEST_API?.init !== "undefined",
    waitForBattleReady: typeof window.__TEST_API?.init?.waitForBattleReady
  }));

  console.log("\nFinal state:", JSON.stringify(finalState, null, 2));

  console.log("\n=== End Test API Debug ===\n");
});
