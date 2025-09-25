import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";
import { waitForBattleState, waitForTestApi } from "./helpers/battleStateHelper.js";
import { waitForSnackbar } from "./fixtures/waits.js";

const buildCliUrl = (testInfo) => {
  const fallbackBase = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5000";
  const baseUrl = testInfo.project.use.baseURL ?? fallbackBase;
  return new URL("/src/pages/battleCLI.html", baseUrl).toString();
};

const waitForCliApis = async (page, timeout = 8000) => {
  await waitForTestApi(page, { timeout });

  const waitForTranscript = expect
    .poll(
      () =>
        page.evaluate(() => {
          try {
            return typeof window.__test?.cli?.appendTranscript === "function";
          } catch {
            return false;
          }
        }),
      { timeout }
    )
    .toBe(true);

  const waitForBattleStore = expect
    .poll(
      () =>
        page.evaluate(() => {
          try {
            return typeof window.__TEST_API?.inspect?.getBattleStore === "function";
          } catch {
            return false;
          }
        }),
      { timeout }
    )
    .toBe(true);

  await Promise.all([waitForTranscript, waitForBattleStore]);
};

test.describe("CLI Keyboard Flows", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto(buildCliUrl(testInfo));
    await page.waitForSelector("#cli-root", { timeout: 8000 });
    await waitForCliApis(page, 8000);
  });

  const startBattle = async (page) => {
    const startButton = page.getByTestId("start-battle-button");
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    await page.waitForSelector('#cli-stats[aria-busy="false"]', { timeout: 10000 });
    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: 10000,
      allowFallback: false
    });
  };

  test("should load CLI interface structure and expose test hooks", async ({ page }) => {
    await withMutedConsole(async () => {
      const cliRoot = page.locator("#cli-root");
      await expect(cliRoot).toBeVisible();
      await expect(page.locator(".terminal-title-bar")).toContainText("JU-DO-KON");
      await expect(page.locator("#cli-header")).toHaveAttribute("role", "banner");
      await expect(page.locator("#cli-main")).toHaveAttribute("role", "main");
      await expect(page.locator("#cli-round")).toContainText("Round");
      await expect(page.locator("#cli-score")).toContainText("You: 0");

      const verboseToggle = page.locator("#verbose-toggle");
      await expect(verboseToggle).toBeVisible();
      await verboseToggle.check();
      await expect(page.locator("#cli-verbose-section")).toBeVisible();

      await startBattle(page);

      const verboseLog = page.locator("#cli-verbose-log");
      await expect(verboseLog).not.toBeEmpty({ timeout: 8000 });
      await expect(verboseLog).toContainText("waitingForPlayerAction", { timeout: 8000 });
    }, ["log", "warn", "error"]);
  });

  test("should toggle help when pressing H and clear invalid key message", async ({ page }) => {
    await withMutedConsole(async () => {
      await startBattle(page);

      const shortcuts = page.locator("#cli-shortcuts");
      await expect(shortcuts).toHaveAttribute("hidden", "");
      const countdown = page.locator("#cli-countdown");

      await page.keyboard.press("x");
      await expect(countdown).toHaveText("Invalid key, press H for help");

      await page.keyboard.press("h");
      await expect(shortcuts).toBeVisible();
      await expect(countdown).not.toContainText("Invalid key, press H for help");

      // Assert help text content
      const helpList = page.locator("#cli-help");
      await expect(helpList).toContainText("[1-5] Select Stat");
      await expect(helpList).toContainText("[Enter] or [Space] Next");
      await expect(helpList).toContainText("[Q] Quit");
      await expect(helpList).toContainText("[H] Toggle Help");

      await page.keyboard.press("h");
      await expect(shortcuts).toHaveAttribute("hidden", "");
    }, ["log", "warn", "error"]);
  });

  test("should select stats with number keys and update store", async ({ page }) => {
    await withMutedConsole(async () => {
      await startBattle(page);

      await page.keyboard.press("1");

      const selectedStat = page.locator("#cli-stats .cli-stat.selected");
      await expect(selectedStat).toHaveCount(1, { timeout: 8000 });
      await expect(selectedStat).toHaveAttribute("aria-selected", "true");
      await waitForSnackbar(page, "You Picked:");
      await expect(page.locator("#snackbar-container .snackbar")).toContainText("You Picked:");
      await expect(page.locator("#cli-stats")).toHaveAttribute("data-selected-index", "1");
      await expect(selectedStat.first()).toContainText("[1]");
    }, ["log", "warn", "error"]);
  });

  test("should resume countdown timers when quitting is canceled", async ({ page }) => {
    await withMutedConsole(async () => {
      await startBattle(page);

      const countdown = page.locator("#cli-countdown");
      await expect(countdown).not.toBeEmpty({ timeout: 8000 });
      await expect(countdown).toHaveAttribute("data-remaining-time", /\d+/, { timeout: 8000 });
      const initialRemainingAttr = await countdown.getAttribute("data-remaining-time");
      const initialRemaining = initialRemainingAttr ? Number(initialRemainingAttr) : Number.NaN;
      expect(initialRemaining).toBeGreaterThan(0);

      await page.keyboard.press("q");
      const cancelButton = page.locator("#cancel-quit-button");
      await expect(cancelButton).toBeVisible();

      await cancelButton.click();
      await expect(page.locator("#confirm-quit-button")).toBeHidden();

      await expect(countdown).not.toBeEmpty({ timeout: 8000 });
      await expect
        .poll(
          async () => {
            const attr = await countdown.getAttribute("data-remaining-time");
            return attr ? Number(attr) : null;
          },
          { timeout: 8000 }
        )
        .toBeLessThan(initialRemaining);
    }, ["log", "warn", "error"]);
  });
});
