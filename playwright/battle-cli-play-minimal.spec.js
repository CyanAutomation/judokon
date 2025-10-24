import { test, expect } from "@playwright/test";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

test("stat selection debug", async ({ page }) => {
  await page.goto("/src/pages/battleCLI.html?autostart=1");

  await waitForTestApi(page);

  await expect
    .poll(async () => {
      const state = await page.evaluate(() =>
        window.__TEST_API?.init?.isBattleReady?.() ? "ready" : "pending"
      );
      return state;
    })
    .toBe("ready");

  await expect
    .poll(() => page.evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null))
    .toBe("waitingForPlayerAction");

  const statsContainer = page.locator("#cli-stats");
  await expect(statsContainer).toBeVisible();

  const statButton = page.locator(".cli-stat").first();
  await expect(statButton).toBeVisible();

  const statKey = await statButton.getAttribute("data-stat");
  console.log("[TEST] About to click stat button:", statKey);

  // DON'T mute console - let errors through
  await statButton.click();
  console.log("[TEST] Stat button clicked");

  // Wait and check state
  await page.waitForTimeout(500);
  const stateAfterClick = await page.evaluate(() => window.__TEST_API?.state?.getBattleState?.());
  console.log("[TEST] State after click:", stateAfterClick);

  const machineState = await page.evaluate(() =>
    window.__TEST_API?.state?.getBattleStateMachine?.()?.getState?.()
  );
  console.log("[TEST] Machine state:", machineState);

  // Check if there were any console errors
  const logs = await page.evaluate(() =>
    (window.__captured_errors || []).map((e) => `${e.level}: ${e.message}`)
  );
  console.log("[TEST] Captured errors:", logs);
});
