import { test, expect } from "@playwright/test";
import selectors from "../helpers/selectors.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import {
  MUTED_CONSOLE_LEVELS,
  PLAYER_SCORE_PATTERN,
  ensureRoundResolved,
  initializeBattle,
  setOpponentResolveDelay,
  waitForRoundsPlayed
} from "./support/opponentRevealTestSupport.js";

test.describe("Classic Battle Opponent Delay Scenarios", () => {
  test(
    "handles very short opponent delays gracefully",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 5 }
        });

        await setOpponentResolveDelay(page, 10);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 200 });

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 1);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "handles long opponent delays without timing out",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 15 }
        });

        await setOpponentResolveDelay(page, 500);

        const firstStat = page.locator(selectors.statButton(0)).first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i);

        await ensureRoundResolved(page, { deadline: 700 });
        await waitForRoundsPlayed(page, 1);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "handles rapid stat selections gracefully",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 5 }
        });

        await setOpponentResolveDelay(page, 50);

        const stats = page.locator("#stat-buttons button[data-stat]");
        await expect(stats.first()).toBeVisible();
        await stats.first().click();
        await stats.nth(1).click();

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 1);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "opponent reveal works when page is navigated during delay",
    async ({ page }) =>
      withMutedConsole(async () => {
        await initializeBattle(page, {
          timerOverrides: { roundTimer: 5 }
        });

        await setOpponentResolveDelay(page, 200);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        await page.goto("/index.html");
        await expect(page.locator(".logo")).toBeVisible();
      }, MUTED_CONSOLE_LEVELS)
  );

  test(
    "opponent reveal handles missing DOM elements gracefully",
    async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__snackbarRemovedByInit = false;

          const removeSnackbarOnce = () => {
            const snackbar = document.querySelector("#snackbar-container");
            if (snackbar) {
              snackbar.remove();
              window.__snackbarRemovedByInit = true;
            }
          };

          removeSnackbarOnce();

          if (!window.__snackbarRemovedByInit) {
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", removeSnackbarOnce, {
                once: true
              });
            } else {
              removeSnackbarOnce();
            }
          }

          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) {
                if (
                  node.nodeType === Node.ELEMENT_NODE &&
                  (node.id === "snackbar-container" ||
                    node.querySelector?.("#snackbar-container"))
                ) {
                  removeSnackbarOnce();
                  observer.disconnect();
                  if (!window.__snackbarRemovedByInit) {
                    window.__snackbarRemovedByInit = true;
                  }
                  return;
                }
              }
            }
          });

          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
        });

        await initializeBattle(page, {
          timerOverrides: { roundTimer: 5 }
        });

        const snackbar = page.locator(selectors.snackbarContainer());
        await page.waitForFunction(() => window.__snackbarRemovedByInit === true);

        const styleHandle = await page.addStyleTag({
          content: "#snackbar-container { display: none !important; }"
        });

        await setOpponentResolveDelay(page, 50);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        const snackbarCount = await snackbar.count();
        if (snackbarCount > 0) {
          await expect(snackbar).toBeHidden();
        }

        await ensureRoundResolved(page);
        await waitForRoundsPlayed(page, 1);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

        await styleHandle.evaluate((element) => element.remove());
      }, MUTED_CONSOLE_LEVELS)
  );
});
