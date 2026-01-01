import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../helpers/selectors.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import { configureApp } from "../fixtures/appConfig.js";
import {
  MUTED_CONSOLE_LEVELS,
  PLAYER_SCORE_PATTERN,
  ensureRoundResolved,
  getBattleSnapshot,
  initializeBattle,
  setOpponentResolveDelay,
  waitForRoundsPlayed
} from "./support/opponentRevealTestSupport.js";
import { waitForBattleReady, waitForBattleState } from "../helpers/battleStateHelper.js";

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

      const countdown = typeof timers?.getCountdown === "function" ? timers.getCountdown() : null;
      const state =
        typeof stateApi?.getBattleState === "function" ? stateApi.getBattleState() : null;

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
  test("resolves the round and updates score after opponent reveal", async ({ page }) =>
    withMutedConsole(async () => {
      await initializeBattle(page, {
        matchSelector: "#round-select-2",
        timerOverrides: { roundTimer: 5 },
        resolveDelay: 1
      });

      const firstStat = page.locator(selectors.statButton()).first();
      await firstStat.click();

      const snackbar = page.locator(selectors.snackbarContainer());
      await waitForBattleState(page, "roundDecision", { timeout: 2_000 });
      await expect(snackbar).toContainText(/^(Opponent is choosing|Next round in)/i, {
        timeout: 2_500
      });

      await ensureRoundResolved(page);
      await waitForRoundsPlayed(page, 1);

      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

      const snapshot = await getBattleSnapshot(page);
      expect(snapshot?.selectionMade).toBe(true);
    }, MUTED_CONSOLE_LEVELS));

  test("advances a resolved round and updates the counter/score", async ({ page }) =>
    withMutedConsole(async () => {
      await initializeBattle(page, {
        matchSelector: "#round-select-2",
        timerOverrides: { roundTimer: 5 },
        nextRoundCooldown: 250,
        resolveDelay: 1
      });

      const roundCounter = page.locator("#round-counter");
      const initialRoundLabel = (await roundCounter.textContent()) ?? "";
      const initialRound = Number(initialRoundLabel.match(/(\d+)/)?.[1]) || 1;
      const expectedRound = initialRound + 1;

      const firstStat = page.locator(selectors.statButton()).first();
      await firstStat.click();

      await ensureRoundResolved(page);
      await waitForRoundsPlayed(page, 1);

      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

      const nextButton = page.locator("#next-button");
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");
      await nextButton.click();

      await expect(roundCounter).toContainText(new RegExp(`Round\\s*${expectedRound}`, "i"));
    }, MUTED_CONSOLE_LEVELS));

  test("advances to the next round after opponent reveal", async ({ page }) =>
    withMutedConsole(async () => {
      await initializeBattle(page, {
        matchSelector: "#round-select-3",
        timerOverrides: { roundTimer: 10 },
        nextRoundCooldown: 1_000,
        resolveDelay: 100
      });

      const firstStat = page.locator(selectors.statButton()).first();
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

      const nextRoundStat = page.locator(selectors.statButton()).first();
      await expect(nextRoundStat).toBeEnabled();
      await nextRoundStat.click();

      const snackbar = page.locator(selectors.snackbarContainer());
      await expect(snackbar).toContainText(/Opponent is choosing/i);
    }, MUTED_CONSOLE_LEVELS));

  test("enables Next during cooldown without orchestrator and advances", async ({ page }) =>
    withMutedConsole(async () => {
      const app = await configureApp(page, {
        testMode: "disable",
        requireRoundSelectModal: true
      });

      try {
        await page.goto("/src/pages/battleClassic.html");
        await app.applyRuntime();

        await page.getByRole("dialog").waitFor();
        await page.getByRole("button", { name: "Medium" }).click();
        await expect(page.getByRole("dialog")).not.toBeVisible();

        try {
          await waitForBattleReady(page, { allowFallback: false });
        } catch (error) {
          await app.cleanup();
          throw new Error(`Battle initialization failed: ${error.message}`);
        }

        const roundCounter = page.locator("#round-counter");
        const initialRoundLabel = (await roundCounter.textContent()) ?? "";
        const initialRound = Number(initialRoundLabel.match(/(\d+)/)?.[1]) || 1;
        const expectedRound = initialRound + 1;

        const nextButton = page.locator("#next-button, [data-role='next-round']").first();

        const firstStat = page.locator(selectors.statButton()).first();
        await firstStat.click();

        // Accept any valid post-selection state (handles skipRoundCooldown flag)
        await waitForBattleState(page, ["cooldown", "roundStart", "waitingForPlayerAction"], {
          allowFallback: false
        });

        // Verify cooldown is actually active before checking Next button
        await expect(nextButton).toBeDisabled({ timeout: 1000 });
        await expect(nextButton).toBeEnabled({ timeout: 10_000 });
        await expect(nextButton).toHaveAttribute("data-next-ready", "true");

        await nextButton.click();

        await waitForBattleState(page, "waitingForPlayerAction", { allowFallback: false });

        // Verify the state actually transitioned from cooldown
        const currentState = await page.evaluate(
          () => window.__TEST_API?.state?.getBattleState?.() ?? null
        );
        expect(currentState).toBe("waitingForPlayerAction");

        await expect(roundCounter).toContainText(new RegExp(`Round\\s*${expectedRound}`, "i"));
        await expect(page.locator(selectors.statButton()).first()).toBeEnabled();
      } finally {
        await app.cleanup();
      }
    }, MUTED_CONSOLE_LEVELS));

  test("opponent reveal state is properly managed between rounds", async ({ page }) =>
    withMutedConsole(async () => {
      await initializeBattle(page, {
        matchSelector: "#round-select-2",
        timerOverrides: { roundTimer: 8 },
        resolveDelay: 100
      });

      const firstStat = page.locator(selectors.statButton()).first();
      await expect(firstStat).toBeVisible();
      await firstStat.click();

      await ensureRoundResolved(page);
      await waitForRoundsPlayed(page, 1);
      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

      const nextButton = page.locator("#next-button");
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      await expect(page.locator(selectors.statButton()).first()).toBeVisible();

      const roundCounter = page.locator("#round-counter");
      await expect(roundCounter).toContainText(/Round\s*2/i);

      const secondStat = page.locator(selectors.statButton()).nth(1);
      await expect(secondStat).toBeVisible();
      await secondStat.click();

      await ensureRoundResolved(page);
      await waitForRoundsPlayed(page, 2);
      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
    }, MUTED_CONSOLE_LEVELS));

  test("opponent reveal cleans up properly on match end", async ({ page }) =>
    withMutedConsole(async () => {
      await initializeBattle(page, {
        timerOverrides: { roundTimer: 5 },
        resolveDelay: 50
      });

      const firstStat = page.locator(selectors.statButton()).first();
      await expect(firstStat).toBeVisible();
      await firstStat.click();

      const snackbar = page.locator(selectors.snackbarContainer());
      await expect(snackbar).toContainText(/Opponent is choosing/i);

      await ensureRoundResolved(page);
      await waitForRoundsPlayed(page, 1);
      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      await expect(snackbar).not.toContainText(/Next round in/i);
    }, MUTED_CONSOLE_LEVELS));

  test("opponent reveal works with different stat selections", async ({ page }) =>
    withMutedConsole(async () => {
      await initializeBattle(page, {
        timerOverrides: { roundTimer: 5 },
        resolveDelay: 50
      });

      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const stats = page.locator(selectors.statButton());
        const statCount = await stats.count();

        if (statCount <= attempt) break;

        const stat = stats.nth(attempt);
        await expect(stat).toBeVisible();
        await stat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i);

        await ensureRoundResolved(page);
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
    }, MUTED_CONSOLE_LEVELS));

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
    test(scenario.name, async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, scenario.init);

        const outcome = await resolveRoundViaCli(page);
        if (!outcome.progressed) {
          throw new Error(`CLI progression failed: ${JSON.stringify(outcome, null, 2)}`);
        }

        await scenario.verify({ page, outcome });
      }, MUTED_CONSOLE_LEVELS)
    );
  }

  test.describe("opponent prompt fallback timer probe", () => {
    test("displays opponent prompt immediately when no delay configured", async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          matchSelector: "#round-select-2",
          timerOverrides: { roundTimer: 5 },
          resolveDelay: 0
        });

        const firstStat = page.locator(selectors.statButton()).first();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 500 });
      }, MUTED_CONSOLE_LEVELS));

    test("displays opponent prompt after configured delay with fallback timer", async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          matchSelector: "#round-select-2",
          timerOverrides: { roundTimer: 5 },
          resolveDelay: 150
        });

        const snackbar = page.locator(selectors.snackbarContainer());
        const firstStat = page.locator(selectors.statButton()).first();

        await firstStat.click();

        // Should appear after the configured delay
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 300 });
      }, MUTED_CONSOLE_LEVELS));

    test("clears fallback timer when next round starts", async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          matchSelector: "#round-select-3",
          timerOverrides: { roundTimer: 10 },
          nextRoundCooldown: 500,
          resolveDelay: 200
        });

        const snackbar = page.locator(selectors.snackbarContainer());
        const firstStat = page.locator(selectors.statButton()).first();

        // Round 1
        await firstStat.click();
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 300 });

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 1);

        const nextButton = page.locator("#next-button");
        await expect(nextButton).toBeEnabled();
        await nextButton.click();

        // Round 2
        await expect
          .poll(
            async () => {
              const snapshot = await getBattleSnapshot(page);
              return snapshot?.selectionMade === false;
            },
            { timeout: 5_000 }
          )
          .toBe(true);

        const secondStat = page.locator(selectors.statButton()).nth(1);
        await secondStat.click();

        // Timer should be cleared and re-scheduled for new round
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 300 });

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 2);
      }, MUTED_CONSOLE_LEVELS));
  });
});
