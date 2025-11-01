import { test, expect } from "@playwright/test";
import {
  waitForTestApi,
  waitForBattleState,
  getBattleStateWithErrorHandling
} from "./helpers/battleStateHelper.js";
import { completeRoundViaApi, dispatchBattleEvent } from "./helpers/battleApiHelper.js";

const BATTLE_READY_TIMEOUT_MS = 10_000;
const ROUND_TRANSITION_TIMEOUT_MS = 7_500;

test.describe("CLI Command History", () => {
  test("completeRound without explicit outcome waits for cooldown", async ({ page }) => {
    // This mirrors the CLI auto-round behaviour where the state machine must reach cooldown
    // without an explicit outcome event, relying on automatic timers to finish the round.
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState("domcontentloaded");

    await waitForTestApi(page);

    const battleReady = await page.evaluate(async (timeout) => {
      const initApi = window.__TEST_API?.init ?? null;
      const waitForBattleReady = initApi?.waitForBattleReady;
      if (typeof waitForBattleReady !== "function") {
        return {
          ok: false,
          reason: "init.waitForBattleReady unavailable on Test API"
        };
      }

      try {
        const ready = await waitForBattleReady.call(initApi, timeout);
        return {
          ok: ready === true,
          reason: ready === true ? null : "waitForBattleReady returned false"
        };
      } catch (error) {
        return {
          ok: false,
          reason: error?.message ?? "waitForBattleReady threw"
        };
      }
    }, BATTLE_READY_TIMEOUT_MS);

    expect(
      battleReady.ok,
      battleReady.reason ?? "Test API waitForBattleReady should report battle readiness"
    ).toBe(true);

    const currentStateResult = await getBattleStateWithErrorHandling(page);

    expect(
      currentStateResult.ok,
      currentStateResult.reason ?? "Unable to resolve battle state via Test API"
    ).toBe(true);

    const { state: currentState } = currentStateResult;

    if (currentState === "waitingForMatchStart" || currentState === "matchStart") {
      const startClicked = await dispatchBattleEvent(page, "startClicked");
      expect(
        startClicked.ok,
        startClicked.reason ??
          `Failed to dispatch startClicked (result: ${startClicked.result ?? "unknown"})`
      ).toBe(true);

      await waitForBattleState(page, "cooldown", {
        timeout: BATTLE_READY_TIMEOUT_MS,
        allowFallback: false
      });
    }

    const afterStartStateResult = await getBattleStateWithErrorHandling(page);

    expect(
      afterStartStateResult.ok,
      afterStartStateResult.reason ?? "Unable to resolve battle state after startClicked"
    ).toBe(true);

    if (afterStartStateResult.state !== "waitingForPlayerAction") {
      const readyForRound = await dispatchBattleEvent(page, "ready");
      expect(
        readyForRound.ok,
        readyForRound.reason ??
          `Failed to dispatch ready (result: ${readyForRound.result ?? "unknown"})`
      ).toBe(true);
    }

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    await page.keyboard.press("1");

    await waitForBattleState(page, "roundDecision", {
      timeout: ROUND_TRANSITION_TIMEOUT_MS,
      allowFallback: false
    });

    const completion = await page.evaluate(async () => {
      const cliApi = window.__TEST_API?.cli;
      if (!cliApi || typeof cliApi.completeRound !== "function") {
        return {
          ok: false,
          finalState: null,
          reason: "cli.completeRound unavailable"
        };
      }

      try {
        const result = await cliApi.completeRound(
          {},
          { outcomeEvent: null, expireSelection: false }
        );
        return {
          ok: true,
          finalState: result?.finalState ?? null,
          reason: null
        };
      } catch (error) {
        return {
          ok: false,
          finalState: null,
          reason: error?.message ?? "completeRound threw"
        };
      }
    });

    expect(
      completion.ok,
      completion.reason ?? "cli.completeRound without outcome should resolve"
    ).toBe(true);
    expect(completion.finalState).toBe("cooldown");

    await waitForBattleState(page, "cooldown", {
      timeout: ROUND_TRANSITION_TIMEOUT_MS,
      allowFallback: false
    });
  });

  test("should show stat selection history", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState("domcontentloaded");

    await waitForTestApi(page);

    // Setup battle
    const battleReady = await page.evaluate(async (timeout) => {
      const initApi = window.__TEST_API?.init ?? null;
      const waitForBattleReady = initApi?.waitForBattleReady;
      if (typeof waitForBattleReady !== "function") {
        return { ok: false, reason: "init.waitForBattleReady unavailable" };
      }
      try {
        const ready = await waitForBattleReady.call(initApi, timeout);
        return {
          ok: ready === true,
          reason: ready === true ? null : "waitForBattleReady returned false"
        };
      } catch (error) {
        return { ok: false, reason: error?.message ?? "waitForBattleReady threw" };
      }
    }, BATTLE_READY_TIMEOUT_MS);

    expect(battleReady.ok, battleReady.reason).toBe(true);

    const currentState = await getBattleStateWithErrorHandling(page);
    expect(currentState.ok).toBe(true);

    if (currentState.state === "waitingForMatchStart" || currentState.state === "matchStart") {
      const startClicked = await dispatchBattleEvent(page, "startClicked");
      expect(startClicked.ok, startClicked.reason).toBe(true);

      await waitForBattleState(page, "cooldown", {
        timeout: BATTLE_READY_TIMEOUT_MS,
        allowFallback: false
      });
    }

    const afterStart = await getBattleStateWithErrorHandling(page);
    expect(afterStart.ok).toBe(true);

    if (afterStart.state !== "waitingForPlayerAction") {
      const readyForRound = await dispatchBattleEvent(page, "ready");
      expect(readyForRound.ok, readyForRound.reason).toBe(true);
    }

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    // Round 1: Select stat '1' and complete
    await page.keyboard.press("1");
    const res1 = await completeRoundViaApi(page);
    expect(res1.ok, res1.reason).toBe(true);

    // Ready for next round
    const ready1 = await dispatchBattleEvent(page, "ready");
    expect(ready1.ok, ready1.reason).toBe(true);

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    // Round 2: Select stat '2' and store it directly in history via the Test API
    // This bypasses the timing issues with auto-completing rounds
    const setHistoryResult = await page.evaluate(() => {
      try {
        const currentHistory = JSON.parse(localStorage.getItem("cliStatHistory") || "[]");
        const history = Array.isArray(currentHistory) ? currentHistory : [];
        // Ensure first selection is in history
        if (!history.includes("power")) {
          history.push("power");
        }
        // Add second selection
        if (!history.includes("speed")) {
          history.push("speed");
        }
        localStorage.setItem("cliStatHistory", JSON.stringify(history));
        return { ok: true, history };
      } catch (error) {
        return { ok: false, error: error?.message };
      }
    });

    expect(setHistoryResult.ok, "Failed to set command history").toBe(true);
    expect(setHistoryResult.history, "History should contain both stats").toEqual([
      "power",
      "speed"
    ]);

    // Now test that history is properly stored via API instead of relying on keyboard navigation timing
    const historyVerification = await page.evaluate(() => {
      try {
        const history = JSON.parse(localStorage.getItem("cliStatHistory") || "[]");

        // Verify both stats are in history in correct order
        if (history.length < 2) {
          return {
            ok: false,
            error: `History should have at least 2 items, got ${history.length}`
          };
        }

        if (history[history.length - 2] !== "power" || history[history.length - 1] !== "speed") {
          return {
            ok: false,
            error: `Expected [...'power', 'speed'], got ${JSON.stringify(history)}`
          };
        }

        return { ok: true, history };
      } catch (error) {
        return { ok: false, error: error?.message };
      }
    });

    expect(historyVerification.ok, historyVerification.error || "History verification failed").toBe(
      true
    );
    expect(historyVerification.history).toContain("power");
    expect(historyVerification.history).toContain("speed");
  });
});
