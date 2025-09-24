import { test, expect } from "@playwright/test";
import selectors from "../../playwright/helpers/selectors";
import { withMutedConsole } from "../../tests/utils/console.js";

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
      const parseScores = (value) => {
        const playerMatch = value.match(/You:\s*(\d+)/i);
        const opponentMatch = value.match(/Opponent:\s*(\d+)/i);
        return {
          player: playerMatch ? Number(playerMatch[1]) : Number.NaN,
          opponent: opponentMatch ? Number(opponentMatch[1]) : Number.NaN
        };
      };
      const initialText = (await score.textContent())?.trim() || "";
      const initialScores = parseScores(initialText);
      const pBefore = Number.isFinite(initialScores.player) ? initialScores.player : 0;
      const oBefore = Number.isFinite(initialScores.opponent) ? initialScores.opponent : 0;
      const initialScorePattern = new RegExp(`You:\\s*${pBefore}\\s+Opponent:\\s*${oBefore}`, "i");

      // Click stat button
      await buttons.first().click();

      const roundMessage = page.locator(selectors.roundMessage());
      let outcomeSnapshot = {
        messageText: "",
        scores: { player: pBefore, opponent: oBefore },
        text: initialText
      };
      await expect
        .poll(async () => {
          const currentText = ((await score.textContent()) || "").trim();
          const messageText = ((await roundMessage.textContent()) || "").trim();
          const parsedScores = parseScores(currentText);
          const playerScore = Number.isFinite(parsedScores.player) ? parsedScores.player : pBefore;
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

      const playerSpan = score.locator('[data-side="player"]');
      const opponentSpan = score.locator('[data-side="opponent"]');
      if ((await playerSpan.count()) > 0 && (await opponentSpan.count()) > 0) {
        await expect(playerSpan).toHaveText(/You:\s*\d+/i);
        await expect(opponentSpan).toHaveText(/Opponent:\s*\d+/i);
      } else {
        await expect(score).toHaveText(/You:\s*\d+/i);
        await expect(score).toHaveText(/Opponent:\s*\d+/i);
      }

      const { scores: resolvedScores, messageText } = outcomeSnapshot;
      const pAfter = Number.isFinite(resolvedScores.player) ? resolvedScores.player : pBefore;
      const oAfter = Number.isFinite(resolvedScores.opponent) ? resolvedScores.opponent : oBefore;
      const tieResolved = /tie|no score/i.test(messageText);

      // Exactly one side should increment by 1 when the stat values differ
      const playerDelta = pAfter - pBefore;
      const opponentDelta = oAfter - oBefore;
      if (!tieResolved && (playerDelta !== 0 || opponentDelta !== 0)) {
        expect([playerDelta, opponentDelta].filter((d) => d === 1).length).toBe(1);
        await expect(score).not.toHaveText(initialScorePattern);
      } else if (tieResolved) {
        expect(playerDelta).toBe(0);
        expect(opponentDelta).toBe(0);
      }
      expect([playerDelta, opponentDelta].filter((d) => d !== 0 && d !== 1).length).toBe(0);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
