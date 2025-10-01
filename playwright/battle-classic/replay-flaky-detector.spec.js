import { test, expect } from "../fixtures/commonSetup.js";

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
    await page.waitForFunction(() => !!window.battleStore);
    // Make match short to iterate quickly
    await page.evaluate(async () => {
      const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
      setPointsToWin(1);
    });
    // Start first match
    await page.click("#round-select-2");

    const getText = async (selector) =>
      (await page.locator(selector).first().textContent())?.trim();

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
      // Open the end modal to access Replay when possible.
      // If a helper exists to finish the match quickly, prefer it; otherwise, rely on existing UI.
      // Here we use the available replay control exposed in the page.

      // End the current round quickly
      // Prefer first available player stat button via helpers
      const anyPlayerStat = page.locator("#stat-buttons button[data-player='0']").first();
      await anyPlayerStat.click();
      // Wait for replay control to be visible
      await page.waitForSelector("#match-replay-button, [data-testid='replay-button']");
      // Click Replay
      await clickReplay();

      // Immediately after replay, scoreboard should be zero. Use tolerant retries.
      const playerScore = page.locator("#player-score, [data-testid='player-score'], header #score-display");
      const opponentScore = page.locator("#opponent-score, [data-testid='opponent-score'], header #score-display");

      // If a unified score display is used, just ensure it contains You: 0 and Opponent: 0.
      const text = (await page.locator("header #score-display").textContent().catch(() => "")) || "";
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
