import { test, expect } from "@playwright/test";
import {
  waitForTestApi,
  waitForBattleState,
  getBattleStateWithErrorHandling
} from "./helpers/battleStateHelper.js";
import { completeRoundViaApi, dispatchBattleEvent } from "./helpers/battleApiHelper.js";

test.describe("CLI Command History", () => {
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
        return { ok: ready === true, reason: ready === true ? null : "waitForBattleReady returned false" };
      } catch (error) {
        return {
          ok: false,
          reason: error?.message ?? "waitForBattleReady threw"
        };
      }
    }, 10_000);

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

      await waitForBattleState(page, "cooldown", { timeout: 10_000, allowFallback: false });
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

    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000, allowFallback: false });

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

    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000, allowFallback: false });

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
