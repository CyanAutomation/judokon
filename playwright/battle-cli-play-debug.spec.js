import { test, expect } from "./fixtures/battleCliFixture.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

test.describe("Battle CLI - Play (Debug)", () => {
  test("should be able to select a stat and see the result", async ({ page }) => {
    // NO withMutedConsole - let console logs through
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

    // Wait for the stats to be ready
    const statsContainer = page.locator("#cli-stats");
    await expect(statsContainer).toBeVisible();

    // The stat buttons should be visible
    const statButton = page.locator(".cli-stat").first();
    await expect(statButton).toBeVisible();

    const statKey = await statButton.getAttribute("data-stat");
    expect(statKey, "stat button should expose a data-stat attribute").toBeTruthy();

    // Set opponent resolve delay to 0 for deterministic testing
    await page.evaluate(() => window.__TEST_API.timers.setOpponentResolveDelay(0));

    // Click the first stat button
    await page.waitForTimeout(1000);
    console.log("[DEBUG TEST] About to click stat button:", statKey);
    await statButton.click();
    console.log("[DEBUG TEST] Stat button clicked, waiting for state...");

    // Wait a bit for dispatch to happen
    await page.waitForTimeout(500);

    // Read debug logs from localStorage
    const selectStatLogs = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("__DEBUG_SELECT_STAT_LOG") || "[]");
      } catch {
        return [];
      }
    });
    console.log("[DEBUG TEST] selectStat logs:", selectStatLogs);

    const dispatchLogs = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("__DEBUG_DISPATCH_LOG") || "[]");
      } catch {
        return [];
      }
    });
    console.log("[DEBUG TEST] Dispatch logs:", dispatchLogs);

    const handleClickLogs = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("__DEBUG_HANDLE_STAT_CLICK") || "[]");
      } catch {
        return [];
      }
    });
    console.log("[DEBUG TEST] handleStatClick logs:", handleClickLogs);

    // Also check the battle state from the state machine directly
    const stateMachineState = await page.evaluate(() => {
      try {
        const machine = window.__TEST_API?.state?.getBattleStateMachine?.();
        return machine?.state?.value ?? "NO_MACHINE";
      } catch (e) {
        return `ERROR: ${e.message}`;
      }
    });
    console.log("[DEBUG TEST] Battle state machine value:", stateMachineState);

    await expect
      .poll(() => {
        return page.evaluate(() => {
          const state = window.__TEST_API?.state?.getBattleState?.() ?? null;
          console.log("[DEBUG POLL] Current battle state:", state);
          return state;
        });
      })
      .toBe("roundDecision", { timeout: 10000 });
  });
});
