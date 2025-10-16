import { test, expect } from "@playwright/test";
import { waitForTestApi, waitForBattleState } from "./helpers/battleStateHelper.js";
import {
  completeRoundViaApi,
  dispatchBattleEvent,
  resolveBattleState
} from "./helpers/battleApiHelper.js";

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

    let currentState = await resolveBattleState(page);

    /*
     * The battle Test API may surface several transient states depending on when the
     * CLI loads relative to the round lifecycle. We normalize into the "waitingForPlayerAction"
     * state by advancing through the same transitions the game uses in production:
     *   waitingForMatchStart → matchStart → cooldown → waitingForPlayerAction.
     * If the state machine is already ahead of one of those transitions, the subsequent
     * dispatches are skipped. Documenting this flow keeps the intent clear and helps
     * future contributors reason about the conditional dispatches below.
     */

    if (currentState === "waitingForMatchStart" || currentState === "matchStart") {
      const startClicked = await dispatchBattleEvent(page, "startClicked");
      expect(
        startClicked.ok,
        startClicked.reason ??
          `Failed to dispatch startClicked (result: ${startClicked.result ?? "unknown"})`
      ).toBe(true);

      await waitForBattleState(page, "cooldown", { timeout: 10_000 });
      currentState = await resolveBattleState(page);
    }

    if (currentState !== "waitingForPlayerAction") {
      const readyForRound = await dispatchBattleEvent(page, "ready");
      expect(
        readyForRound.ok,
        readyForRound.reason ??
          `Failed to dispatch ready (result: ${readyForRound.result ?? "unknown"})`
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
    expect(
      readyForNextRound.ok,
      readyForNextRound.reason ?? "Failed to dispatch ready from cooldown"
    ).toBe(true);

    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 10_000 });

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
