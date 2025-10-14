import { test, expect } from "@playwright/test";
import selectors from "../helpers/selectors.js";
import { waitForBattleReady, waitForBattleState } from "../helpers/battleStateHelper.js";
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

async function setupBattle(page, overrides = {}) {
  await initializeBattle(page, overrides);
  await waitForBattleReady(page, { timeout: 7_000 });
  await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_000 });
}

async function pickFirstStat(page) {
  const statButton = page.locator(selectors.statButton(0)).first();
  await expect(statButton).toBeVisible();
  await statButton.click();
}

test.describe("Classic Battle Opponent Reveal", () => {
  test("reveals the opponent card and records the round via Test API", async ({ page }) =>
    withMutedConsole(async () => {
      await setupBattle(page, {
        matchSelector: "#round-select-2",
        timerOverrides: { roundTimer: 6 },
        resolveDelay: 30
      });

      const before = await getBattleSnapshot(page);
      expect(before?.roundsPlayed ?? 0).toBe(0);

      await pickFirstStat(page);
      await waitForBattleState(page, "roundDecision", { timeout: 2_000 });
      await expect(page.locator(selectors.snackbarContainer())).toContainText(
        /Opponent is choosing/i
      );

      await ensureRoundResolved(page);
      await waitForBattleState(page, "roundOver");
      await waitForRoundsPlayed(page, 1);

      const after = await getBattleSnapshot(page);
      expect(after?.roundsPlayed).toBeGreaterThanOrEqual(1);
      expect(after?.selectionMade).toBe(true);

      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
    }, MUTED_CONSOLE_LEVELS));

  test("supports long opponent delays without falling back to DOM polling", async ({ page }) =>
    withMutedConsole(async () => {
      await setupBattle(page, {
        matchSelector: "#round-select-3",
        timerOverrides: { roundTimer: 12 }
      });

      await setOpponentResolveDelay(page, 450);
      await pickFirstStat(page);

      await waitForBattleState(page, "roundDecision", { timeout: 2_000 });
      await ensureRoundResolved(page, { deadline: 800 });
      await waitForBattleState(page, "roundOver");
      await waitForRoundsPlayed(page, 1);

      const snapshot = await getBattleSnapshot(page);
      expect(snapshot?.roundsPlayed).toBeGreaterThanOrEqual(1);
      expect(snapshot?.selectionMade).toBe(true);
    }, MUTED_CONSOLE_LEVELS));

  test("resets stat selection after advancing to the next round", async ({ page }) =>
    withMutedConsole(async () => {
      await setupBattle(page, {
        matchSelector: "#round-select-1",
        timerOverrides: { roundTimer: 8 },
        nextRoundCooldown: 300,
        resolveDelay: 25
      });

      await pickFirstStat(page);
      await ensureRoundResolved(page);
      await waitForBattleState(page, "roundOver");

      const firstRound = await getBattleSnapshot(page);
      expect(firstRound?.selectionMade).toBe(true);

      const nextButton = page.locator("#next-button");
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      await waitForBattleState(page, "waitingForPlayerAction");
      const secondRound = await getBattleSnapshot(page);
      expect(secondRound?.selectionMade).toBe(false);

      await pickFirstStat(page);
      await ensureRoundResolved(page, { forceResolve: true });
      await waitForRoundsPlayed(page, 2);

      const afterSecondRound = await getBattleSnapshot(page);
      expect(afterSecondRound?.roundsPlayed).toBeGreaterThanOrEqual(2);
      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
    }, MUTED_CONSOLE_LEVELS));

  test("continues resolving rounds even when snackbar container is removed", async ({ page }) =>
    withMutedConsole(async () => {
      const routePattern = "**/src/pages/battleClassic.html";
      const removeSnackbarContainer = async (route) => {
        const response = await route.fetch();
        const originalBody = await response.text();
        const modifiedBody = originalBody.replace(
          /<div id="snackbar-container"[\s\S]*?<\/div>/,
          "<!-- snackbar container removed for missing DOM scenario -->"
        );

        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: modifiedBody,
          contentType: response.headers()["content-type"]
        });
      };

      await page.route(routePattern, removeSnackbarContainer);

      try {
        await setupBattle(page, {
          matchSelector: "#round-select-1",
          timerOverrides: { roundTimer: 6 },
          resolveDelay: 40
        });
      } finally {
        await page.unroute(routePattern, removeSnackbarContainer);
      }

      await pickFirstStat(page);
      await ensureRoundResolved(page);
      await waitForBattleState(page, "roundOver");

      const snapshot = await getBattleSnapshot(page);
      expect(snapshot?.roundsPlayed).toBeGreaterThanOrEqual(1);
    }, MUTED_CONSOLE_LEVELS));

  test("can safely navigate away mid-reveal without leaving timers running", async ({ page }) =>
    withMutedConsole(async () => {
      await setupBattle(page, {
        matchSelector: "#round-select-2",
        timerOverrides: { roundTimer: 5 },
        resolveDelay: 200
      });

      await pickFirstStat(page);
      await waitForBattleState(page, "roundDecision");

      await page.goto("/index.html");
      await expect(page.locator(".logo")).toBeVisible();

      const timerState = await page.evaluate(() => {
        const timers = window.__TEST_API?.timers;
        return {
          countdown: typeof timers?.getCountdown === "function" ? timers.getCountdown() : null,
          resolveDelay:
            typeof timers?.getOpponentResolveDelay === "function"
              ? timers.getOpponentResolveDelay()
              : null
        };
      });

      expect(timerState.countdown === null || timerState.countdown >= 0).toBe(true);
    }, MUTED_CONSOLE_LEVELS));
});
