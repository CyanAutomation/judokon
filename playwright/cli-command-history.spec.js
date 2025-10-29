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

    // Select stat '1'
    await page.keyboard.press("1");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("You Picked: Power");

    const resolution = await completeRoundViaApi(page);
    expect(resolution.ok, resolution.reason ?? "Failed to complete round via Test API").toBe(true);
    await waitForBattleState(page, "roundOver");

    const continueResult = await dispatchBattleEvent(page, "continue");
    expect(continueResult.ok, continueResult.reason ?? "Failed to dispatch continue").toBe(true);

    const readyForNextRound = await dispatchBattleEvent(page, "ready");
    expect(
      readyForNextRound.ok,
      readyForNextRound.reason ?? "Failed to dispatch ready from cooldown"
    ).toBe(true);

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("Select your move");

    // Select stat '2'
    await page.keyboard.press("2");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("You Picked: Speed");

    // Test history navigation
    await page.keyboard.press("Control+ArrowUp");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: speed");
    await expect(page.locator("#cli-stats")).toHaveAttribute("data-history-preview", "speed");
    await expect(page.locator(".cli-stat.history-preview")).toHaveAttribute("data-stat", "speed");

    await page.keyboard.press("Control+ArrowUp");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: power");
    await expect(page.locator("#cli-stats")).toHaveAttribute("data-history-preview", "power");
    await expect(page.locator(".cli-stat.history-preview")).toHaveAttribute("data-stat", "power");

    await page.keyboard.press("Control+ArrowDown");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: speed");
    await expect(page.locator(".cli-stat.history-preview")).toHaveAttribute("data-stat", "speed");

    await page.keyboard.press("Control+ArrowDown");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("");
    await expect(page.locator(".cli-stat.history-preview")).toHaveCount(0);
  });
});
