import { test, expect } from "./fixtures/battleCliFixture.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const CLI_PATH = "/src/pages/battleCLI.html";

function buildCliUrl(query = "") {
  const suffix = query ? `?${query}` : "";
  return `${CLI_PATH}${suffix}`;
}

async function getBattleCliModuleResetCount(page, defaultValue = -1) {
  return await page.evaluate(
    (fallback) =>
      window.__TEST_API?.init?.getBattleCliModuleResetCount?.() ?? fallback,
    defaultValue
  );
}

async function validateResetHelper(page) {
  return await page.evaluate(() =>
    window.__TEST_API?.init?.resetBattleCliModuleState?.()
  );
}

async function resetCounterBetweenChecks(page) {
  await page.evaluate(() =>
    window.__TEST_API?.init?.__resetBattleCliModuleResetCount?.()
  );
}

test.describe("battleCliFixture", () => {
  test("invokes the Battle CLI reset helper after each navigation", async ({ page }) => {
    await page.goto(buildCliUrl("autostart=1"));
    await waitForTestApi(page);

    const initialCount = await getBattleCliModuleResetCount(page, 0);
    expect(initialCount).toBeGreaterThan(0);

    await resetCounterBetweenChecks(page);
    const resetCount = await getBattleCliModuleResetCount(page);
    expect(resetCount).toBe(0);

    await page.goto(buildCliUrl("autostart=1&seed=first"));
    await waitForTestApi(page);
    const afterFirstNavigation = await getBattleCliModuleResetCount(page);
    expect(afterFirstNavigation).toBe(1);

    const firstNavigationResetResult = await validateResetHelper(page);
    expect(firstNavigationResetResult).toMatchObject({
      ok: true,
      count: 2,
      reason: null
    });

    await resetCounterBetweenChecks(page);

    await page.goto(buildCliUrl("autostart=1&seed=second"));
    await waitForTestApi(page);
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
