import { test, expect } from "../fixtures/commonSetup.js";
import {
  setPointsToWin,
  waitForBattleReady,
  waitForMatchCompletion
} from "../helpers/battleStateHelper.js";
import { completeRoundViaApi } from "../helpers/battleApiHelper.js";

const SPEC_REFERENCE = "Spec: CLASSIC-REPLAY-ROUND-COUNTER-01";

test.describe("Classic Battle replay - round counter", () => {
  test(`[${SPEC_REFERENCE}] replay resets round counter to 1`, async ({ page }) => {
    // Spec reference: CLASSIC-REPLAY-ROUND-COUNTER-01
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        ...(window.__FF_OVERRIDES || {}),
        showRoundSelectModal: true
      };
    });
    await page.goto("/src/pages/battleClassic.html");

    await page.locator('button:has-text("Quick")').click();
    await waitForBattleReady(page, { allowFallback: true });
    await setPointsToWin(page, 1, { timeout: 10_000 });

    await page.getByTestId("stat-button").first().click();
    const roundResolution = await completeRoundViaApi(page, {
      options: { opponentResolveDelayMs: 0, expireSelection: false }
    });
    expect(roundResolution.ok).toBe(true);

    await waitForMatchCompletion(page, { timeout: 10_000, allowFallback: true });

    const replayBtn = page.getByTestId("replay-button");
    await expect(replayBtn).toBeVisible();

    await replayBtn.click();

    const playerScoreValue = page.getByTestId("player-score-value");
    const opponentScoreValue = page.getByTestId("opponent-score-value");
    const roundCounter = page.getByTestId("round-counter");

    await expect(playerScoreValue).toHaveText("0");
    await expect(opponentScoreValue).toHaveText("0");
    await expect(roundCounter).toContainText(/Round\s*1/i);
  });
});
