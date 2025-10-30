// Playwright smoke test: verifies inter-round cooldown auto-advances
import { test, expect } from "@playwright/test";
import {
  waitForBattleReady,
  waitForBattleState
} from "./helpers/battleStateHelper.js";
import { completeRoundViaApi } from "./helpers/battleApiHelper.js";

const WAIT_FOR_ADVANCE_TIMEOUT = 15_000;

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

    const readRoundsPlayed = async () =>
      await page.evaluate(() => {
        const getRounds = window.__TEST_API?.state?.getRoundsPlayed;
        if (typeof getRounds === "function") {
          const value = Number(getRounds());
          return Number.isFinite(value) ? value : null;
        }
        return null;
      });

    const readCountdown = async () =>
      await page.evaluate(() => {
        const getter = window.__TEST_API?.timers?.getCountdown;
        return typeof getter === "function" ? getter() : null;
      });

    await waitForBattleState(page, "waitingForPlayerAction", { allowFallback: false, timeout: 10_000 });

    const roundsBefore = (await readRoundsPlayed()) ?? 0;

    const roundCompletion = await completeRoundViaApi(page);

    if (!roundCompletion.ok) {
      // Fallback: select the first available stat to complete the round naturally
      const firstStat = page.locator("#stat-buttons button").first();
      await expect(firstStat).toBeVisible();
      await expect(firstStat).toBeEnabled();
      await firstStat.click({ trial: true });
      await firstStat.click();
    }

    await waitForBattleState(page, "cooldown", {
      allowFallback: false,
      timeout: WAIT_FOR_ADVANCE_TIMEOUT
    });

    await expect
      .poll(readCountdown, {
        message: "expected countdown helper to report cooldown seconds",
        timeout: WAIT_FOR_ADVANCE_TIMEOUT
      })
      .not.toBeNull();

    const cooldownCountdown = await readCountdown();
    expect(typeof cooldownCountdown).toBe("number");
    expect(Number(cooldownCountdown)).toBeGreaterThan(0);

    await waitForBattleState(page, "waitingForPlayerAction", {
      allowFallback: false,
      timeout: WAIT_FOR_ADVANCE_TIMEOUT
    });

    const roundsAfter = (await readRoundsPlayed()) ?? 0;
    expect(roundsAfter).toBeGreaterThanOrEqual(roundsBefore + 1);
  });
});
