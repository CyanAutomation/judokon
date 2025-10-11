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

async function resolveRoundViaCli(page) {
  return await page.evaluate(async () => {
    try {
      const api = window.__TEST_API?.cli;
      const timers = window.__TEST_API?.timers;
      const stateApi = window.__TEST_API?.state;

      if (!api) {
        return {
          progressed: false,
          countdown: typeof timers?.getCountdown === "function" ? timers.getCountdown() : null,
          state: stateApi?.getBattleState?.() ?? null,
          error: "CLI_API_UNAVAILABLE"
        };
      }

      if (typeof stateApi?.waitForBattleState === "function") {
        try {
          await stateApi.waitForBattleState("waitingForPlayerAction");
        } catch {}
      }

      let pickResult = null;
      if (typeof api.pickFirstStat === "function") {
        pickResult = await api.pickFirstStat();
      }

      let resolved = false;
      if (typeof api.resolveRound === "function") {
        const result = await api.resolveRound();
        resolved = result !== false;
      }

      if (resolved && typeof stateApi?.waitForBattleState === "function") {
        try {
          await stateApi.waitForBattleState("roundOver");
        } catch {}
      }

      const countdown =
        typeof timers?.getCountdown === "function" ? timers.getCountdown() : null;
      const state =
        typeof stateApi?.getBattleState === "function"
          ? stateApi.getBattleState()
          : null;

      return { progressed: resolved, countdown, state, pickResult };
    } catch (error) {
      return {
        progressed: false,
        countdown: null,
        state: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}

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

  const cliScenarios = [
    {
      name: "supports CLI-driven round resolution with default timers",
      init: { timerOverrides: { roundTimer: 8 } },
      verify: async ({ page, outcome }) => {
        expect(outcome.pickResult).not.toBe(false);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }
    },
    {
      name: "CLI progression resets countdown after short timer rounds",
      init: { timerOverrides: { roundTimer: 3 }, resolveDelay: 100 },
      verify: async ({ page, outcome }) => {
        expect(outcome.countdown === null || outcome.countdown <= 3).toBe(true);

        const countdown = await page.evaluate(
          () => window.__TEST_API?.timers?.getCountdown?.() ?? null
        );
        expect(countdown === null || countdown <= 3).toBe(true);

        await waitForRoundsPlayed(page, 1);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }
    }
  ];

  for (const scenario of cliScenarios) {
    test(
      scenario.name,
      async ({ page }) =>
        withMutedConsole(async () => {
          await initializeBattle(page, scenario.init);

          const outcome = await resolveRoundViaCli(page);
          if (!outcome.progressed) {
            throw new Error(
              `CLI progression failed: ${JSON.stringify(outcome, null, 2)}`
            );
          }

          await scenario.verify({ page, outcome });
        }, MUTED_CONSOLE_LEVELS)
    );
  }
});
