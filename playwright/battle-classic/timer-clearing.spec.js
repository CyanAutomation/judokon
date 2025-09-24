import { test, expect } from "@playwright/test";
import selectors from "../../playwright/helpers/selectors";
import { withMutedConsole } from "../../tests/utils/console.js";
import { buildScorePattern, parseScores } from "../helpers/scoreUtils.js";

test.describe("Classic Battle timer clearing", () => {
  test("score is updated immediately when stat selection is made", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      // Start the match
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons to be ready
      const container = page.getByTestId("stat-buttons");
      await expect(container).toHaveAttribute("data-buttons-ready", "true");
      const buttons = page.locator(selectors.statButton(0));
      await expect(buttons.first()).toBeVisible();

      // Verify timer is initially running
      const timerLocator = page.locator(selectors.nextRoundTimer());
      await expect(timerLocator).toHaveText(/Time Left: \d+s/);

      // Capture initial score text for deterministic comparison
      const score = page.locator(selectors.scoreDisplay());
      const initialText = (await score.textContent())?.trim() || "";
      const initialScores = parseScores(initialText);
      const pBefore = Number.isFinite(initialScores.player) ? initialScores.player : 0;
      const oBefore = Number.isFinite(initialScores.opponent) ? initialScores.opponent : 0;
      const initialScorePattern = buildScorePattern(pBefore, oBefore);

      // Click stat button
      await buttons.first().click();

      const roundMessage = page.locator(selectors.roundMessage());
      let outcomeSnapshot = {
        messageText: "",
        scores: { player: pBefore, opponent: oBefore },
        text: initialText
      };
      try {
        await expect
          .poll(async () => {
            const currentText = ((await score.textContent()) || "").trim();
            const messageText = ((await roundMessage.textContent()) || "").trim();
            const parsedScores = parseScores(currentText);
            const playerScore = Number.isFinite(parsedScores.player)
              ? parsedScores.player
              : pBefore;
            const opponentScore = Number.isFinite(parsedScores.opponent)
              ? parsedScores.opponent
              : oBefore;
            const scoreChanged = playerScore !== pBefore || opponentScore !== oBefore;
            const messageIndicatesTie = /tie|no score/i.test(messageText);

            outcomeSnapshot = {
              messageText,
              text: currentText,
              scores: { player: playerScore, opponent: opponentScore }
            };

            return scoreChanged || messageIndicatesTie;
          })
          .toBeTruthy();
      } catch (error) {
        if (error instanceof Error) {
          error.message = `Expected score change or tie message. Final state: ${JSON.stringify(
            outcomeSnapshot
          )}\n${error.message}`;
        }
        throw error;
      }

      const playerSpan = score.locator('[data-side="player"]');
      const opponentSpan = score.locator('[data-side="opponent"]');
      const hasSpanStructure = (await playerSpan.count()) > 0 && (await opponentSpan.count()) > 0;
      if (hasSpanStructure) {
        await expect(playerSpan).toHaveText(/You:\s*\d+/i);
        await expect(opponentSpan).toHaveText(/Opponent:\s*\d+/i);
      } else {
        await expect(score).toHaveText(/You:\s*\d+.*Opponent:\s*\d+/i);
      }

      const { scores: resolvedScores, messageText } = outcomeSnapshot;
      const pAfter = Number.isFinite(resolvedScores.player) ? resolvedScores.player : pBefore;
      const oAfter = Number.isFinite(resolvedScores.opponent) ? resolvedScores.opponent : oBefore;
      const tieResolved = /tie|no score/i.test(messageText);

      // Exactly one side should increment by 1 when the stat values differ
      const playerDelta = pAfter - pBefore;
      const opponentDelta = oAfter - oBefore;
      if (tieResolved) {
        expect(playerDelta).toBe(0);
        expect(opponentDelta).toBe(0);
      } else {
        expect([playerDelta, opponentDelta].filter((d) => d === 1).length).toBe(1);
        await expect(score).not.toHaveText(initialScorePattern);
      }
      expect([0, 1]).toContain(playerDelta);
      expect([0, 1]).toContain(opponentDelta);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
