import { test, expect } from "@playwright/test";
import selectors from "../helpers/selectors.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import {
  MUTED_CONSOLE_LEVELS,
  PLAYER_SCORE_PATTERN,
  ensureRoundResolved,
  getBattleSnapshot,
  initializeBattle,
  setOpponentResolveDelay,
  waitForRoundsPlayed
} from "./support/opponentRevealTestSupport.js";

test.describe("Classic Battle Opponent Round Flow", () => {
  test(
    "resolves the round and updates score after opponent reveal",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          matchSelector: "#round-select-2",
          timerOverrides: { roundTimer: 5 },
          resolveDelay: 1
        });

        const firstStat = page.locator(selectors.statButton(0)).first();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 500 });

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 1);

        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

        const snapshot = await getBattleSnapshot(page);
        expect(snapshot?.selectionMade).toBe(true);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "advances to the next round after opponent reveal",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          matchSelector: "#round-select-3",
          timerOverrides: { roundTimer: 10 },
          nextRoundCooldown: 1_000,
          resolveDelay: 100
        });

        const firstStat = page.locator(selectors.statButton(0)).first();
        await firstStat.click();

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 1);

        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

        const nextButton = page.locator("#next-button");
        await expect(nextButton).toHaveAttribute("data-next-ready", "true");
        await nextButton.click();

        await expect
          .poll(
            async () => {
              const snapshot = await getBattleSnapshot(page);
              return snapshot?.selectionMade === false;
            },
            {
              timeout: 5_000,
              message: "Expected stat selection to reset for the next round"
            }
          )
          .toBe(true);

        const roundCounter = page.locator("#round-counter");
        await expect(roundCounter).toContainText(/Round\s*2/i);

        const nextRoundStat = page.locator(selectors.statButton(0)).first();
        await expect(nextRoundStat).toBeEnabled();
        await nextRoundStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "opponent reveal state is properly managed between rounds",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          matchSelector: "#round-select-2",
          timerOverrides: { roundTimer: 8 },
          resolveDelay: 100
        });

        const firstStat = page.locator(selectors.statButton(0)).first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        await ensureRoundResolved(page, { forceResolve: true });
        await waitForRoundsPlayed(page, 1);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

        const nextButton = page.locator("#next-button");
        await expect(nextButton).toBeEnabled();
        await nextButton.click();

        await expect(page.locator(selectors.statButton(0)).first()).toBeVisible();

        const roundCounter = page.locator("#round-counter");
        await expect(roundCounter).toContainText(/Round\s*2/i);

        const secondStat = page.locator(selectors.statButton(0)).nth(1);
        await expect(secondStat).toBeVisible();
        await secondStat.click();

        await ensureRoundResolved(page, { forceResolve: true });
        await waitForRoundsPlayed(page, 2);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "opponent reveal cleans up properly on match end",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 5 },
          resolveDelay: 50
        });

        const firstStat = page.locator(selectors.statButton(0)).first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i);

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 1);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
        await expect(snackbar).not.toContainText(/Next round in/i);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "opponent reveal works with different stat selections",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 5 },
          resolveDelay: 50
        });

        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const stats = page.locator(selectors.statButton(0));
          const statCount = await stats.count();

          if (statCount <= attempt) break;

          const stat = stats.nth(attempt);
          await expect(stat).toBeVisible();
          await stat.click();

          const snackbar = page.locator(selectors.snackbarContainer());
          await expect(snackbar).toContainText(/Opponent is choosing/i);

          await ensureRoundResolved(page, { forceResolve: true });
          await waitForRoundsPlayed(page, attempt + 1);
          await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

          if (attempt < maxAttempts - 1) {
            const nextButton = page.locator("#next-button");
            await expect(nextButton).toBeEnabled();
            await nextButton.click();

            await expect
              .poll(
                async () => {
                  const snapshot = await getBattleSnapshot(page);
                  return snapshot?.selectionMade === false;
                },
                {
                  timeout: 5_000,
                  message: "Expected selection to reset before next stat pick"
                }
              )
              .toBe(true);

            await setOpponentResolveDelay(page, 50);
          }
        }
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "supports timer integration via CLI progression",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 8 }
        });

        const forcedResolved = await page.evaluate(async () => {
          try {
            const api = window.__TEST_API;
            if (api?.cli) {
              if (typeof api.cli.pickFirstStat === "function") {
                await api.cli.pickFirstStat();
              }
              if (typeof api.cli.resolveRound === "function") {
                await api.cli.resolveRound();
                return true;
              }
            }
          } catch {}
          return false;
        });

        expect(forcedResolved).toBe(true);

        const scoreText = await page.locator(selectors.scoreDisplay()).innerText();
        expect(PLAYER_SCORE_PATTERN.test(scoreText)).toBe(true);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "opponent reveal integrates with timer functionality",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 3 },
          resolveDelay: 100
        });

        const progressed = await page.evaluate(async () => {
          try {
            const api = window.__TEST_API?.cli;
            if (!api) return false;
            if (typeof api.pickFirstStat === "function") await api.pickFirstStat();
            if (typeof api.resolveRound === "function") await api.resolveRound();
            return true;
          } catch {
            return false;
          }
        });
        expect(progressed).toBe(true);

        const scoreText = await page.locator(selectors.scoreDisplay()).innerText();
        expect(PLAYER_SCORE_PATTERN.test(scoreText)).toBe(true);
      }, MUTED_CONSOLE_LEVELS)
  );
});
