// Playwright smoke test: verifies inter-round cooldown auto-advances
import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";
import {
  completeRoundViaApi,
  readRoundsPlayed,
  readCountdown,
  forceRoundAdvance
} from "./helpers/battleApiHelper.js";

const WAIT_FOR_ADVANCE_TIMEOUT = 15_000;

async function waitForStateViaTestApi(page, expectedState, timeoutMs = WAIT_FOR_ADVANCE_TIMEOUT) {
  try {
    const result = await page.evaluate(
      ({ state, timeout }) => {
        const stateApi = window.__TEST_API?.state;
        if (!stateApi || typeof stateApi.waitForBattleState !== "function") {
          throw new Error("__TEST_API.state.waitForBattleState unavailable");
        }
        return stateApi.waitForBattleState(state, timeout);
      },
      { state: expectedState, timeout: timeoutMs }
    );

    expect(
      result,
      `Expected window.__TEST_API.state.waitForBattleState("${expectedState}") to resolve true`
    ).toBeTruthy();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error ?? "unknown error");
    console.warn(
      `waitForStateViaTestApi failed for "${expectedState}": ${reason}. Falling back to waitForBattleState.`
    );

    try {
      await waitForBattleState(page, expectedState, {
        timeout: timeoutMs,
        allowFallback: true
      });
    } catch (fallbackError) {
      const fallbackReason =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError ?? "unknown error");
      throw new Error(
        `Failed to wait for state "${expectedState}" via Test API: ${reason}. Fallback waitForBattleState also failed: ${fallbackReason}`
      );
    }
  }
}

test.describe("Classic Battle – auto-advance", () => {
  test("shows countdown and auto-advances without Next", async ({ page }) => {
    await page.goto("/index.html");

    // Navigate to Classic Battle if needed
    let startBtn = await page.$('[data-testid="start-classic"]');
    if (startBtn) {
      await startBtn.click();
    } else {
      // Fallback: click by text selector
      startBtn = await page.getByText("Classic Battle").first();
      await startBtn.click();
    }

    await waitForBattleReady(page, { allowFallback: false });

    await waitForBattleState(page, "waitingForPlayerAction", {
      allowFallback: false,
      timeout: 10_000
    });

    const roundsBefore = (await readRoundsPlayed(page)) ?? 0;

    const roundCompletion = await completeRoundViaApi(page);

    if (!roundCompletion.ok) {
      const forcedAdvance = await forceRoundAdvance(page);

      if (!forcedAdvance.ok) {
        console.warn(
          `forceRoundAdvance failed: ${forcedAdvance.reason ?? "unknown reason"}, falling back to UI interaction`
        );
        // Final fallback: select the first available stat to complete the round naturally
        const firstStat = page.locator("#stat-buttons button").first();
        await expect(firstStat).toBeVisible();
        await expect(firstStat).toBeEnabled();
        await firstStat.click({ trial: true });
        await firstStat.click();
      }
    }

    await waitForStateViaTestApi(page, "cooldown");

    const cooldownCountdown = await readCountdown(page);
    const countdownValue = Number(cooldownCountdown);
    expect(Number.isFinite(countdownValue)).toBe(true);
    expect(countdownValue).toBeGreaterThan(0);

    await waitForStateViaTestApi(page, "waitingForPlayerAction");

    const roundsAfter = (await readRoundsPlayed(page)) ?? 0;
    expect(roundsAfter).toBeGreaterThanOrEqual(roundsBefore + 1);
  });
});
