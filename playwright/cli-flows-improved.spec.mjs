import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";

test("Battle state access via Test API (no DOM manipulation)", async ({ page }) =>
  withMutedConsole(async () => {
    const url = process.env.CLI_TEST_URL || "http://127.0.0.1:5000/src/pages/battleCLI.html";
    await page.goto(url);

    // Wait for Test API to be available - this replaces waiting for timers
    await page.waitForFunction(() => window.__TEST_API !== undefined);

    // Test direct battle state access instead of DOM polling
    await page.evaluate(() => window.__TEST_API.state.getBattleState());
    // console.log("✅ Current battle state:", battleState, "(could be null in CLI - that's expected)");

    // Test battle readiness via Test API instead of DOM inspection
    const isReady = await page.evaluate(() => window.__TEST_API.init.isBattleReady());
    expect(isReady).toBe(true);
    // console.log("✅ Battle ready:", isReady);

    // Test store inspection via Test API instead of window.battleStore access
    const storeInfo = await page.evaluate(() => window.__TEST_API.inspect.getBattleStore());
    expect(storeInfo).toBeDefined();
    expect(storeInfo.selectionMade).toBe(false);
    // console.log("✅ Store info:", storeInfo);

    // Test state snapshot access - direct API instead of DOM data attributes
    await page.evaluate(() => window.__TEST_API.state.getStateSnapshot());
    // console.log("✅ State snapshot:", snapshot, "(state could be null in CLI)");

    // Test debug info compilation - comprehensive state without DOM inspection
    const debugInfo = await page.evaluate(() => window.__TEST_API.inspect.getDebugInfo());
    expect(debugInfo.error).toBeUndefined();
    // console.log("✅ Debug info:", debugInfo);

    // Verify page functionality without any DOM manipulation
    await expect(page).toHaveURL(/battleCLI.html/);
    // console.log(
    //   "✅ Test completed successfully with direct API access - no DOM manipulation needed!"
    // );
  }, ["log", "warn", "error"]));
