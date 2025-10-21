import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleReady, waitForRoundStats } from "../helpers/battleStateHelper.js";
import selectors from "../helpers/selectors.js";

// Focused detector for intermittent scoreboard staleness after Replay.
// Loops replay N times and asserts the scoreboard is zeroed before a new round starts.
// Keep runtime modest (N small) to avoid slowing CI while still surfacing races locally.

test.describe("Classic Battle — Replay flaky detector", () => {
  test("replay loop maintains zeroed scoreboard", async ({ page }) => {
    // Align with existing classic battle setup used in replay.spec
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");
    await waitForBattleReady(page, { allowFallback: false });

    const configured = await page.evaluate(() => {
      const engineApi = window.__TEST_API?.engine;
      if (!engineApi) {
        return { applied: false, error: "ENGINE_API_UNAVAILABLE" };
      }

      const success = engineApi.setPointsToWin(1);
      const current = engineApi.getPointsToWin();
      return { applied: success && current === 1, error: success ? null : "SET_FAILED" };
    });

    if (!configured.applied) {
      throw new Error(`Failed to configure replay detector: ${configured.error}`);
    }
    // Start first match
    await page.click("#round-select-2");

    // Helper to run a replay click via either end modal or scaffold button.
    const clickReplay = async () => {
      // Prefer data-testid on scaffold if present.
      const scaffoldBtn = page.getByTestId("replay-button");
      if (await scaffoldBtn.isVisible().catch(() => false)) {
        await scaffoldBtn.click();
        return;
      }
      // Fallback to end-of-match modal id
      const modalBtn = page.locator("#match-replay-button");
      await modalBtn.click();
    };

    // Loop a handful of times to try and surface timing issues.
    const iterations = 3;
    for (let i = 0; i < iterations; i++) {
      if (i > 0) {
        await waitForRoundStats(page);
      }
      // Open the end modal to access Replay when possible.
      // If a helper exists to finish the match quickly, prefer it; otherwise, rely on existing UI.
      // Here we use the available replay control exposed in the page.

      // End the current round quickly
      // Prefer the first available shared stat button via the selectors helper
      const anyPlayerStat = page.locator(selectors.statButton()).first();
      await anyPlayerStat.click();
      // Wait for replay control to be visible
      await page.waitForSelector("#match-replay-button, [data-testid='replay-button']");
      // Click Replay
      await clickReplay();
      await waitForRoundStats(page);

      // Immediately after replay, scoreboard should be zero. Use tolerant retries.
      const playerScore = page.locator(
        "#player-score, [data-testid='player-score'], header #score-display"
      );
      const opponentScore = page.locator(
        "#opponent-score, [data-testid='opponent-score'], header #score-display"
      );

      // If a unified score display is used, just ensure it contains You: 0 and Opponent: 0.
      const text =
        (await page
          .locator("header #score-display")
          .textContent()
          .catch(() => "")) || "";
      if (text) {
        expect(text).toMatch(/You:\s*0/);
        expect(text).toMatch(/Opponent:\s*0/);
      } else {
        await expect(playerScore).toHaveText(/^(0|00)$/);
        await expect(opponentScore).toHaveText(/^(0|00)$/);
      }

      // Also assert round message is present (round started) to ensure UI didn’t hang.
      await expect(page.locator("#round-message")).toBeVisible();
    }
  });
});
