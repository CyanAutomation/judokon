import { test, expect } from "@playwright/test";
import { waitForTestApi, waitForBattleState } from "./helpers/battleStateHelper.js";

async function dispatchBattleEvent(page, eventName) {
  return await page.evaluate(async (event) => {
    const api = window.__TEST_API?.state;
    if (!api || typeof api.dispatchBattleEvent !== "function") {
      return { ok: false, result: null, reason: "state.dispatchBattleEvent unavailable" };
    }

    try {
      const result = await api.dispatchBattleEvent(event);
      return { ok: result !== false, result: result ?? null, reason: null };
    } catch (error) {
      return { ok: false, result: null, reason: error?.message ?? "dispatch failed" };
    }
  }, eventName);
}

async function completeRoundViaApi(page, roundInput = {}) {
  return await page.evaluate(async (input) => {
    const cliApi = window.__TEST_API?.cli;
    if (!cliApi || typeof cliApi.completeRound !== "function") {
      return {
        ok: false,
        reason: "cli.completeRound unavailable",
        finalState: null
      };
    }

    try {
      const resolution = await cliApi.completeRound(input, {
        outcomeEvent: "outcome=winPlayer",
        opponentResolveDelayMs: 0
      });
      return {
        ok: resolution?.finalState === "roundOver",
        reason: null,
        finalState: resolution?.finalState ?? null
      };
    } catch (error) {
      return {
        ok: false,
        reason: error?.message ?? "completeRound failed",
        finalState: null
      };
    }
  }, roundInput);
}

test.describe("CLI Command History", () => {
  test("should show stat selection history", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState("domcontentloaded");

    await waitForTestApi(page);

    const battleReady = await page.evaluate(async () => {
      const initApi = window.__TEST_API?.init;
      if (!initApi || typeof initApi.waitForBattleReady !== "function") {
        return false;
      }

      const ready = await initApi.waitForBattleReady.call(initApi, 10_000);
      return ready === true;
    });
    expect(battleReady, "Test API should report battle readiness").toBe(true);

    const resolveBattleState = async () => {
      return await page.evaluate(() => {
        try {
          return window.__TEST_API?.state?.getBattleState?.() ?? null;
        } catch {
          return null;
        }
      });
    };

    let currentState = await resolveBattleState();

    if (currentState === "waitingForMatchStart" || currentState === "matchStart") {
      const startClicked = await dispatchBattleEvent(page, "startClicked");
      expect(
        startClicked.ok,
        startClicked.reason ??
          `Failed to dispatch startClicked (result: ${startClicked.result ?? "unknown"})`
      ).toBe(true);

      await waitForBattleState(page, "cooldown", { timeout: 10_000 });
      currentState = await resolveBattleState();
    }

    if (currentState !== "waitingForPlayerAction") {
      const readyForRound = await dispatchBattleEvent(page, "ready");
      expect(
        readyForRound.ok,
        readyForRound.reason ?? `Failed to dispatch ready (result: ${readyForRound.result ?? "unknown"})`
      ).toBe(true);
    }

    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

    // Select stat '1'
    await page.keyboard.press("1");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("You Picked: Power");

    const resolution = await completeRoundViaApi(page);
    expect(resolution.ok, resolution.reason ?? "Failed to complete round via Test API").toBe(true);
    await waitForBattleState(page, "roundOver");

    const continueResult = await dispatchBattleEvent(page, "continue");
    expect(continueResult.ok, continueResult.reason ?? "Failed to dispatch continue").toBe(true);

    const readyForNextRound = await dispatchBattleEvent(page, "ready");
    expect(readyForNextRound.ok, readyForNextRound.reason ?? "Failed to dispatch ready from cooldown").toBe(true);

    await waitForBattleState(page, "waitingForPlayerAction");

    // Select stat '2'
    await page.keyboard.press("2");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("You Picked: Speed");

    // Test history navigation
    await page.keyboard.press("Control+ArrowUp");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: speed");

    await page.keyboard.press("Control+ArrowUp");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: power");

    await page.keyboard.press("Control+ArrowDown");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: speed");

    await page.keyboard.press("Control+ArrowDown");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("");
  });
});
