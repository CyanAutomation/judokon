import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";

const CLI_PAGE = "/src/pages/battleCLI.html";

test.describe("CLI Keyboard Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CLI_PAGE);
    await page.waitForSelector("#cli-root", { timeout: 8000 });
    await page.waitForFunction(
      () =>
        typeof window !== "undefined" &&
        window.__test?.cli?.appendTranscript &&
        window.__TEST_API?.inspect?.getBattleStore,
      { timeout: 8000 }
    );
    await page.waitForSelector('#cli-stats[aria-busy="false"]', { timeout: 8000 });
  });

  test("should load CLI interface structure and expose test hooks", async ({ page }) => {
    await withMutedConsole(async () => {
      const cliRoot = page.locator("#cli-root");
      await expect(cliRoot).toBeVisible();
      await expect(page.locator(".terminal-title-bar")).toContainText("JU-DO-KON");
      await expect(page.locator("#cli-header")).toHaveAttribute("role", "banner");
      await expect(page.locator("#cli-main")).toHaveAttribute("role", "main");
      await expect(page.locator("#cli-round")).toContainText("Round");
      await expect(page.locator("#cli-score")).toContainText("You: 0");

      const apiState = await page.evaluate(() => {
        const selectionTimers = window.__test?.getSelectionTimers?.();
        const cooldownTimers = window.__test?.getCooldownTimers?.();
        const hasAppend = typeof window.__test?.cli?.appendTranscript === "function";
        const hasShowVerbose = typeof window.__test?.cli?.showVerboseSection === "function";
        const testApi = window.__TEST_API;
        const stateApis = {
          battleState: typeof testApi?.state?.getBattleState === "function",
          debugInfo: typeof testApi?.inspect?.getDebugInfo === "function",
          battleStore: typeof testApi?.inspect?.getBattleStore === "function"
        };
        if (hasShowVerbose) {
          window.__test.cli.showVerboseSection();
        }
        if (hasAppend) {
          window.__test.cli.appendTranscript([
            "Round 1 started",
            { from: "waitingForMatchStart", to: "waitingForPlayerAction" }
          ]);
        }
        const verboseText = document.getElementById("cli-verbose-log")?.textContent?.trim();
        return {
          selectionTimers,
          cooldownTimers,
          hasAppend,
          hasShowVerbose,
          stateApis,
          verboseText
        };
      });

      expect(apiState.hasAppend).toBe(true);
      expect(apiState.hasShowVerbose).toBe(true);
      expect(apiState.selectionTimers?.selectionTimer).toBeNull();
      expect(apiState.selectionTimers?.selectionInterval).toBeNull();
      expect(apiState.cooldownTimers?.cooldownTimer).toBeNull();
      expect(apiState.stateApis.battleState).toBe(true);
      expect(apiState.stateApis.debugInfo).toBe(true);
      expect(apiState.stateApis.battleStore).toBe(true);
      expect(apiState.verboseText).toContain("Round 1 started");
      expect(apiState.verboseText).toContain("waitingForPlayerAction");
    }, ["log", "warn", "error"]);
  });

  test("should toggle help when pressing H and clear invalid key message", async ({ page }) => {
    await withMutedConsole(async () => {
      const shortcuts = page.locator("#cli-shortcuts");
      await expect(shortcuts).toHaveAttribute("hidden", "");
      const countdown = page.locator("#cli-countdown");

      await page.keyboard.press("x");
      await expect(countdown).toHaveText("Invalid key, press H for help");

      await page.keyboard.press("h");
      await expect(shortcuts).toBeVisible();
      await expect(countdown).toHaveText("");

      await page.keyboard.press("h");
      await expect(shortcuts).toHaveAttribute("hidden", "");
    }, ["log", "warn", "error"]);
  });

  test("should select stats with number keys and update store", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.waitForFunction(
        () => document.querySelector('#cli-stats .cli-stat[data-stat-index]'),
        { timeout: 8000 }
      );
      await page.evaluate(() => {
        document.body.dataset.battleState = "waitingForPlayerAction";
        window.__test.handleBattleState({ detail: { from: null, to: "waitingForPlayerAction" } });
      });
      await page.locator("#cli-stats").focus();

      await page.keyboard.press("1");

      const selectedStat = page.locator("#cli-stats .cli-stat.selected");
      await expect(selectedStat).toHaveCount(1, { timeout: 8000 });
      await expect(selectedStat).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#snackbar-container .snackbar")).toContainText("You Picked:");

      const storeSnapshot = await page.evaluate(() => {
        const list = document.getElementById("cli-stats");
        const selected = list?.querySelector(".cli-stat.selected");
        const label = selected?.textContent?.replace(/\s+/g, " ").trim();
        const statIndex = selected?.dataset?.statIndex;
        const store = window.__TEST_API.inspect.getBattleStore();
        return {
          selectedIndex: list?.dataset?.selectedIndex,
          statIndex,
          label,
          store
        };
      });

      expect(storeSnapshot.selectedIndex).toBe("1");
      expect(storeSnapshot.statIndex).toBe("1");
      expect(storeSnapshot.store?.selectionMade).toBe(true);
      expect(typeof storeSnapshot.store?.playerChoice).toBe("string");
      expect(storeSnapshot.label).toContain("[1]");
    }, ["log", "warn", "error"]);
  });

  test("should resume countdown timers when quitting is canceled", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.evaluate(() => {
        document.body.dataset.battleState = "waitingForPlayerAction";
        window.__test.handleBattleState({ detail: { from: null, to: "waitingForPlayerAction" } });
        window.__test.startSelectionCountdown(5);
      });

      const timersBefore = await page.evaluate(() => window.__test.getSelectionTimers());
      expect(timersBefore.selectionTimer).not.toBeNull();
      expect(timersBefore.selectionInterval).not.toBeNull();

      await page.keyboard.press("q");
      const cancelButton = page.locator("#cancel-quit-button");
      await expect(cancelButton).toBeVisible();

      const paused = await page.evaluate(() => window.__test.getPausedTimes());
      expect(paused.selection).toBeGreaterThanOrEqual(0);

      await cancelButton.click();
      await expect(page.locator("#confirm-quit-button")).toBeHidden();

      await expect.poll(async () => {
        const timers = await page.evaluate(() => window.__test.getSelectionTimers());
        return Boolean(timers.selectionTimer && timers.selectionInterval);
      }).toBe(true);
      const pausedAfter = await page.evaluate(() => window.__test.getPausedTimes());
      expect(pausedAfter.selection).toBeNull();

      await page.evaluate(() => {
        window.__test.pauseTimers();
        window.__test.setSelectionTimers(null, null);
      });
    }, ["log", "warn", "error"]);
  });
});
