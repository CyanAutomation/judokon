import { test, expect } from "./fixtures/battleCliFixture.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const CLI_PATH = "/src/pages/battleCLI.html";

function buildCliUrl(query = "") {
  const suffix = query ? `?${query}` : "";
  return `${CLI_PATH}${suffix}`;
}

async function waitForBattleCliReset(page, timeout = 5000) {
  return page.waitForFunction(() => window.__battleCliResetCompleted !== undefined, {
    timeout
  });
}

async function getBattleCliModuleResetCount(page, defaultValue = -1) {
  return await page.evaluate(
    (fallback) => window.__TEST_API?.init?.getBattleCliModuleResetCount?.() ?? fallback,
    defaultValue
  );
}

/**
 * Validates the reset helper by invoking the Battle CLI module state reset.
 * @param {import("@playwright/test").Page} page - The Playwright page object.
 * @returns {Promise<{ ok: boolean, count: number, reason: string | null }>} Reset result object.
 * @pseudocode Call window.__TEST_API.init.resetBattleCliModuleState and return the result
 */
async function validateResetHelper(page) {
  return await page.evaluate(() => {
    if (!window.__TEST_API?.init?.resetBattleCliModuleState) {
      throw new Error("resetBattleCliModuleState method not available in TEST_API");
    }
    return window.__TEST_API.init.resetBattleCliModuleState();
  });
}

/**
 * Resets the Battle CLI module reset counter between test checks.
 * @param {import("@playwright/test").Page} page - The Playwright page object.
 * @returns {Promise<void>}
 * @pseudocode Call window.__TEST_API.init.__resetBattleCliModuleResetCount to clear counter
 */
async function resetBattleCliModuleResetCounter(page) {
  await page.evaluate(() => {
    if (!window.__TEST_API?.init?.__resetBattleCliModuleResetCount) {
      throw new Error("__resetBattleCliModuleResetCount method not available in TEST_API");
    }
    window.__TEST_API.init.__resetBattleCliModuleResetCount();
  });
}

test.describe("battleCliFixture", () => {
  test("invokes the Battle CLI reset helper after each navigation", async ({ page }) => {
    await page.goto(buildCliUrl("autostart=1"));
    await waitForTestApi(page);

    // Debug: check what's available before waiting for reset
    const beforeReset = await page.evaluate(() => ({
      hasBattleCliInit: typeof window.__battleCLIinit !== "undefined",
      hasResetModuleState: typeof window.__battleCLIinit?.__resetModuleState === "function",
      battleCliInitKeys: Object.keys(window.__battleCLIinit || {}),
      hasTestApi: typeof window.__TEST_API !== "undefined",
      hasInitApi: typeof window.__TEST_API?.init !== "undefined",
      hasResetMethod: typeof window.__TEST_API?.init?.resetBattleCliModuleState === "function"
    }));
    console.log("Before reset wait:", JSON.stringify(beforeReset, null, 2));

    await waitForBattleCliReset(page);

    const resetResult = await page.evaluate(() => window.__battleCliResetCompleted);
    console.log("First reset result:", JSON.stringify(resetResult, null, 2));

    const initialCount = await getBattleCliModuleResetCount(page, 0);
    expect(initialCount).toBeGreaterThan(0);

    await resetBattleCliModuleResetCounter(page);
    const resetCount = await page.evaluate(
      () => window.__TEST_API?.init?.getBattleCliModuleResetCount?.() ?? -1
    );
    expect(resetCount).toBe(0);

    // Reset the completed flag before navigating again
    await page.evaluate(() => {
      delete window.__battleCliResetCompleted;
    });

    await page.goto(buildCliUrl("autostart=1&seed=first"));
    await waitForTestApi(page);
    await waitForBattleCliReset(page);

    const afterFirstNavigation = await getBattleCliModuleResetCount(page);
    expect(afterFirstNavigation).toBe(1);

    const firstNavigationResetResult = await validateResetHelper(page);
    expect(firstNavigationResetResult).toMatchObject({
      ok: true,
      count: 2,
      reason: null
    });

    await resetBattleCliModuleResetCounter(page);
    await page.evaluate(() => {
      delete window.__battleCliResetCompleted;
    });

    await page.goto(buildCliUrl("autostart=1&seed=second"));
    await waitForTestApi(page);
    await waitForBattleCliReset(page);

    const afterSecondNavigation = await getBattleCliModuleResetCount(page);
    expect(afterSecondNavigation).toBe(1);

    const secondNavigationResetResult = await validateResetHelper(page);
    expect(secondNavigationResetResult).toMatchObject({
      ok: true,
      count: 2,
      reason: null
    });
  });
});
