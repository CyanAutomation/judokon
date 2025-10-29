import { test, expect } from "./fixtures/battleCliFixture.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const CLI_PATH = "/src/pages/battleCLI.html";

function buildCliUrl(query = "") {
  const suffix = query ? `?${query}` : "";
  return `${CLI_PATH}${suffix}`;
}

test.describe("battleCliFixture", () => {
  test("invokes the Battle CLI reset helper after each navigation", async ({ page }) => {
    await page.goto(buildCliUrl("autostart=1"));
    await waitForTestApi(page);

    const initialCount = await page.evaluate(() =>
      window.__TEST_API?.init?.getBattleCliModuleResetCount?.() ?? 0
    );
    expect(initialCount).toBeGreaterThan(0);

    await page.evaluate(() => window.__TEST_API?.init?.__resetBattleCliModuleResetCount?.());
    const resetCount = await page.evaluate(() =>
      window.__TEST_API?.init?.getBattleCliModuleResetCount?.() ?? -1
    );
    expect(resetCount).toBe(0);

    await page.goto(buildCliUrl("autostart=1&seed=first"));
    await waitForTestApi(page);
    const afterFirstNavigation = await page.evaluate(() =>
      window.__TEST_API?.init?.getBattleCliModuleResetCount?.() ?? -1
    );
    expect(afterFirstNavigation).toBe(1);

    await page.goto(buildCliUrl("autostart=1&seed=second"));
    await waitForTestApi(page);
    const afterSecondNavigation = await page.evaluate(() =>
      window.__TEST_API?.init?.getBattleCliModuleResetCount?.() ?? -1
    );
    expect(afterSecondNavigation).toBe(2);
  });
});
