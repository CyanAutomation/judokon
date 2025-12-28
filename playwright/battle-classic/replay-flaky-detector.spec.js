import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleReady, waitForRoundStats } from "../helpers/battleStateHelper.js";
import selectors from "../helpers/selectors.js";

// Focused detector for intermittent scoreboard staleness after Replay.
// Loops replay N times and asserts the scoreboard is zeroed before a new round starts.
// Keep runtime modest (N small) to avoid slowing CI while still surfacing races locally.

test.describe("Classic Battle — Replay flaky detector", () => {
  // PRD: design/productRequirementsDocuments/prdBattleScoreboard.md (replay resets score/round UI)
  test("replay loop maintains zeroed scoreboard", async ({ page }) => {
    // Align with existing classic battle setup used in replay.spec
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");
    await waitForBattleReady(page, { allowFallback: false });

    // Start first match
    await page.waitForSelector("#round-select-1");
    await page.click("#round-select-1");

    const matchEndModal = page.locator("#match-end-modal");
    const nextButton = page.locator("#next-button");
    const anyPlayerStat = page.locator(selectors.statButton()).first();

    for (let round = 0; round < 5; round += 1) {
      await waitForRoundStats(page);
      await anyPlayerStat.click();

      await page.waitForSelector("#match-end-modal, #next-button[data-next-ready='true']");
      if (await matchEndModal.isVisible().catch(() => false)) {
        break;
      }

      await expect(nextButton).toHaveAttribute("data-next-ready", "true");
      await nextButton.click();
    }

    await expect(matchEndModal).toBeVisible();

    await page.waitForSelector("#match-replay-button");
    await page.locator("#match-replay-button").click();

    // Wait for the UI to fully re-stabilize after replay.
    await waitForRoundStats(page);

    // Immediately after replay, scoreboard should be zero.
    const playerScoreValue = page.getByTestId("player-score-value");
    const opponentScoreValue = page.getByTestId("opponent-score-value");
    await expect(playerScoreValue).toHaveText("0");
    await expect(opponentScoreValue).toHaveText("0");

    const roundCounter = page.getByTestId("round-counter");
    await expect(roundCounter).toHaveText(/Round\s*1/);
  });
});
