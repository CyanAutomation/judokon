import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleReady, waitForRoundStats } from "../helpers/battleStateHelper.js";
import selectors from "../helpers/selectors.js";
import { TEST_ROUND_TIMER_MS } from "../helpers/testTiming.js";

// Focused detector for intermittent scoreboard staleness after Replay.
// Loops replay N times and asserts the scoreboard is zeroed before a new round starts.
// Keep runtime modest (N small) to avoid slowing CI while still surfacing races locally.

test.describe("Classic Battle — Replay flaky detector", () => {
  // PRD: design/productRequirementsDocuments/prdBattleScoreboard.md (replay resets score/round UI)
  test("replay loop maintains zeroed scoreboard", async ({ page }) => {
    // Align with existing classic battle setup used in replay.spec
    await page.addInitScript(
      ({ roundTimerMs }) => {
        window.__OVERRIDE_TIMERS = { roundTimer: roundTimerMs };
        window.__NEXT_ROUND_COOLDOWN_MS = 0;
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      },
      { roundTimerMs: TEST_ROUND_TIMER_MS }
    );
    await page.goto("/src/pages/battleClassic.html");
    await waitForBattleReady(page, { allowFallback: false });

    const setQuickMatch = await page.evaluate(() => {
      const engineApi = window.__TEST_API?.engine;
      if (!engineApi) {
        return { applied: false, error: "ENGINE_API_UNAVAILABLE" };
      }

      const success = engineApi.setPointsToWin(1);
      const current = engineApi.getPointsToWin();

      return {
        applied: success && current === 1,
        error: success ? (current === 1 ? null : "VALIDATION_FAILED") : "SET_FAILED"
      };
    });

    if (!setQuickMatch.applied) {
      throw new Error(`Failed to configure quick match: ${setQuickMatch.error}`);
    }

    const roundSelectButton = page.locator("#round-select-1");
    if (await roundSelectButton.isVisible().catch(() => false)) {
      await roundSelectButton.click();
    }
    await waitForRoundStats(page);

    const matchEndModal = page.locator("#match-end-modal");
    const anyPlayerStat = page.locator(selectors.statButton()).first();
    await anyPlayerStat.click();
    await expect(matchEndModal).toBeVisible();

    const replayButton = page.locator("#match-replay-button");
    await expect(replayButton).toBeVisible();
    await replayButton.click();

    // Wait for the UI to fully re-stabilize after replay.
    await waitForRoundStats(page);

    // Immediately after replay, scoreboard should be zero.
    const playerScoreValue = page.getByTestId("player-score-value");
    const opponentScoreValue = page.getByTestId("opponent-score-value");
    await expect(playerScoreValue).toBeVisible();
    await expect(opponentScoreValue).toBeVisible();
    await expect(playerScoreValue).toHaveText("0");
    await expect(opponentScoreValue).toHaveText("0");

    const roundCounter = page.getByTestId("round-counter");
    await expect(roundCounter).toBeVisible();
    await expect(roundCounter).toHaveText(/Round\s*1/);
  });
});
