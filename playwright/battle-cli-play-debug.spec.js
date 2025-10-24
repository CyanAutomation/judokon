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
        const stateApi = window.__TEST_API?.state;
        if (!stateApi) return "NO_STATE_API";
        const getMachineFunc = stateApi.getBattleStateMachine;
        if (!getMachineFunc) return "NO_GET_MACHINE_FUNC";
        const machine = getMachineFunc();
        if (!machine) return "MACHINE_IS_NULL";
        const state = machine.getState?.();
        return {
          current: state ?? "NO_GET_STATE",
          fullMachine: machine?.state || "NO_STATE_PROP"
        };
      } catch (e) {
        return `ERROR: ${e.message}`;
      }
    });
    console.log(
      "[DEBUG TEST] Battle state machine info:",
      JSON.stringify(stateMachineState, null, 2)
    );

    // Wait a bit more and check state again
    await page.waitForTimeout(1000);
    const stateMachineState2 = await page.evaluate(() => {
      try {
        return window.__TEST_API?.state?.getBattleStateMachine?.()?.getState?.() ?? "NO_STATE";
      } catch (e) {
        return `ERROR: ${e.message}`;
      }
    });
    console.log("[DEBUG TEST] Battle state machine value after 1s wait:", stateMachineState2);

    await expect
      .poll(
        () => {
          return page.evaluate(() => {
            const state = window.__TEST_API?.state?.getBattleStateMachine?.()?.getState?.() ?? null;
            const snapshot = window.__TEST_API?.state?.getStateSnapshot?.() ?? {};
            console.log(
              "[DEBUG POLL] Current battle state:",
              state,
              "| Event:",
              snapshot.event,
              "| Previous:",
              snapshot.prev
            );
            return state;
          });
        },
        {
          timeout: 10000,
          intervals: [100] // Check every 100ms to catch all transitions
        }
      )
      .toBe("roundDecision");
  });
});
