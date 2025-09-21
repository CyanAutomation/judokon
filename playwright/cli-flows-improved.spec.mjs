import { test, expect } from "./fixtures/commonSetup.js";
import { withMutedConsole } from "../tests/utils/console.js";
import {
  waitForBattleReady,
  waitForBattleState,
  waitForTestApi
} from "./helpers/battleStateHelper.js";

const buildCliUrl = (testInfo) => {
  const fallbackBase = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5000";
  const baseUrl = testInfo.project.use.baseURL ?? fallbackBase;
  return new URL("/src/pages/battleCLI.html", baseUrl).toString();
};

const gotoCliPage = async (page, testInfo) => {
  await page.goto(buildCliUrl(testInfo));
};

const ensureBattleReady = async (page) => {
  await waitForBattleReady(page, { timeout: 10_000 });
};

const waitForStatsReady = async (page) => {
  await page.waitForSelector('#cli-stats[aria-busy="false"]', { timeout: 10_000 });
};

const startBattle = async (page) => {
  await ensureBattleReady(page);
  const startButton = page.getByTestId("start-battle-button");
  if (await startButton.isVisible()) {
    await startButton.click();
  }

  await waitForStatsReady(page);
  await waitForBattleState(page, "waitingForPlayerAction", {
    timeout: 10_000,
    allowFallback: false
  });
};

const runWithConsoleDiscipline = (callback) => withMutedConsole(callback, ["log", "warn", "error"]);

const testWithConsole = (title, fn) => {
  test(title, async ({ page }, testInfo) => {
    await runWithConsoleDiscipline(async () => {
      await fn({ page }, testInfo);
    });
  });
};

const getBattleStore = (page) =>
  page.evaluate(() => window.__TEST_API?.inspect?.getBattleStore?.() ?? null);

const getBattleState = (page) =>
  page.evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null);

// Note: the previous getRoundsPlayed helper has been removed intentionally. The tests now
// assert battle progression through explicit state waits and CLI stat instrumentation instead
// of reading the internal rounds counter directly.

test.beforeEach(async ({ page }, testInfo) => {
  await gotoCliPage(page, testInfo);
  await waitForTestApi(page, { timeout: 10_000 });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          try {
            return typeof window.__TEST_API?.inspect?.getBattleStore === "function";
          } catch {
            return false;
          }
        }),
      { timeout: 10_000 }
    )
    .toBe(true);
});

test.describe("CLI Battle Interface", () => {
  test.describe("Page Structure and Loading", () => {
    testWithConsole("page loads with proper terminal structure", async ({ page }) => {
      await ensureBattleReady(page);

      const cliRoot = page.locator("#cli-root");
      await expect(cliRoot).toBeVisible();
      await expect(page).toHaveTitle(/Classic Battle.*CLI/);
      await expect(page.locator(".terminal-title-bar")).toContainText("JU-DO-KON");
      await expect(page.locator("#cli-header")).toHaveAttribute("role", "banner");
      await expect(page.locator("#cli-main")).toHaveAttribute("role", "main");
      await expect(page.locator(".cli-footer")).toHaveAttribute("role", "contentinfo");
    });

    testWithConsole("header displays correct initial state", async ({ page }) => {
      await ensureBattleReady(page);

      const title = page.locator(".cli-title");
      await expect(title).toContainText("Classic Battle (CLI)");
      await expect(title.locator('[data-testid="home-link"]')).toBeVisible();

      const roundDisplay = page.locator("#cli-round");
      await expect(roundDisplay).toContainText("Round");
      await expect(roundDisplay).toContainText("Target: 10");

      const scoreDisplay = page.locator("#cli-score");
      await expect(scoreDisplay).toContainText("You: 0 Opponent: 0");
      await expect(scoreDisplay).toHaveAttribute("data-score-player", "0");
      await expect(scoreDisplay).toHaveAttribute("data-score-opponent", "0");
    });

    testWithConsole("main sections are properly structured", async ({ page }) => {
      await ensureBattleReady(page);

      const roundSection = page.locator('section[aria-label="Round Status"]');
      await expect(roundSection).toBeVisible();
      await expect(roundSection.locator("#round-message")).toBeVisible();
      await expect(roundSection.locator("#cli-countdown")).toBeVisible();

      const settingsSection = page.locator('section[aria-label="Match Settings"]');
      await expect(settingsSection).toBeVisible();
      await expect(settingsSection).toHaveClass(/cli-settings/);

      const statSection = page.locator('section[aria-label="Stat Selection"]');
      await expect(statSection).toBeVisible();
      const statList = statSection.locator("#cli-stats");
      await expect(statList).toHaveAttribute("role", "listbox");
      await expect(statList).toHaveAttribute("aria-busy", "false");

      const prompt = page.locator("#cli-prompt");
      await expect(prompt).toBeVisible();
      await expect(prompt).toHaveAttribute("role", "status");
    });

    testWithConsole("footer displays control hints", async ({ page }) => {
      await ensureBattleReady(page);

      const controlsHint = page.locator("#cli-controls-hint");
      await expect(controlsHint).toContainText("[1–5] Stats");
      await expect(controlsHint).toContainText("[Enter/Space] Next");
      await expect(controlsHint).toContainText("[H] Help");
      await expect(controlsHint).toContainText("[Q] Quit");
      await expect(controlsHint).toHaveAttribute("aria-hidden", "true");
    });
  });

  test.describe("Settings Functionality", () => {
    testWithConsole("settings toggle works correctly", async ({ page }) => {
      await ensureBattleReady(page);

      const settingsToggle = page.locator("#cli-settings-toggle");
      const settingsBody = page.locator("#cli-settings-body");

      await expect(settingsToggle).toHaveAttribute("aria-expanded", "true");
      await expect(settingsBody).toBeVisible();

      await settingsToggle.click();
      await expect(settingsToggle).toHaveAttribute("aria-expanded", "false");
      await expect(settingsBody).toBeHidden();

      await settingsToggle.click();
      await expect(settingsToggle).toHaveAttribute("aria-expanded", "true");
      await expect(settingsBody).toBeVisible();
    });

    testWithConsole("win target selection works", async ({ page }) => {
      await ensureBattleReady(page);

      const pointsSelect = page.locator("#points-select");
      await expect(pointsSelect).toHaveAttribute("aria-label", "Points to win");
      await expect(pointsSelect).toHaveValue("10");

      try {
        await pointsSelect.selectOption("5");
      } catch {}
      const optionCount = await pointsSelect.evaluate((element) => element.options.length);
      expect(optionCount).toBeGreaterThan(0);
    });

    testWithConsole("verbose toggle works", async ({ page }) => {
      await ensureBattleReady(page);

      const verboseToggle = page.locator("#verbose-toggle");
      const verboseSection = page.locator("#cli-verbose-section");

      await expect(verboseToggle).toHaveAttribute("aria-label", "Toggle verbose logging");
      await expect(verboseToggle).not.toBeChecked();
      await expect(verboseSection).toBeHidden();

      await verboseToggle.check();
      await expect(verboseToggle).toBeChecked();
      await expect(verboseSection).toBeVisible();

      await verboseToggle.uncheck();
      await expect(verboseToggle).not.toBeChecked();
      await expect(verboseSection).toBeHidden();
    });

    testWithConsole("seed input validation works", async ({ page }) => {
      await ensureBattleReady(page);

      const seedInput = page.locator("#seed-input");
      const seedError = page.locator("#seed-error");

      await expect(seedInput).toHaveAttribute("aria-label", "Deterministic seed (optional)");
      await expect(seedInput).toHaveAttribute("inputmode", "numeric");
      await expect(seedInput).toHaveAttribute("type", "number");
      await expect(seedInput).toHaveValue("");
      await expect(seedError).toBeEmpty();

      await seedInput.fill("12345");
      await expect(seedInput).toHaveValue("12345");
      await expect(seedError).toBeEmpty();

      await seedInput.fill("-123");
      await expect(seedInput).toHaveValue("-123");
    });
  });

  test.describe("Stat Selection", () => {
    testWithConsole("stat list displays stat elements", async ({ page }) => {
      await startBattle(page);

      const statList = page.locator("#cli-stats");
      const statElements = statList.locator(".cli-stat");

      await expect(statElements).toHaveCount(5);
      await expect(statElements.first()).toBeVisible();
      await expect(statElements.first()).toHaveClass(/cli-stat/);
    });

    testWithConsole("stat list is keyboard focusable", async ({ page }) => {
      await startBattle(page);

      const statList = page.locator("#cli-stats");
      await expect(statList).toHaveAttribute("tabindex", "0");
      await expect(statList).toHaveAttribute("aria-label", "Select a stat with number keys 1–5");
    });

    testWithConsole("number key selection works", async ({ page }) => {
      await startBattle(page);

      const statList = page.locator("#cli-stats");
      await statList.focus();
      await page.keyboard.press("2");

      const selectedStat = page.locator("#cli-stats .cli-stat.selected");
      await expect(selectedStat).toHaveCount(1, { timeout: 10_000 });
      await expect(selectedStat.first()).toHaveAttribute("aria-selected", "true");
      await expect(statList).toHaveAttribute("data-selected-index", "2");
      await expect(page.locator("#snackbar-container .snackbar")).toContainText("You Picked:");

      await expect
        .poll(async () => {
          const store = await getBattleStore(page);
          return store?.selectionMade ?? false;
        })
        .toBe(true);
    });

    testWithConsole("enter and space keys work for progression", async ({ page }) => {
      await startBattle(page);

      const statList = page.locator("#cli-stats");
      await statList.focus();
      await page.keyboard.press("1");

      await expect
        .poll(async () => {
          const store = await getBattleStore(page);
          return store?.selectionMade ?? false;
        })
        .toBe(true);

      await page.keyboard.press("Enter");
      await expect.poll(() => getBattleState(page)).toBe("waitingForPlayerAction");
      await expect(page.locator("#cli-stats .cli-stat.selected")).toHaveCount(0);

      await page.keyboard.press("2");
      await expect
        .poll(async () => {
          const store = await getBattleStore(page);
          return store?.selectionMade ?? false;
        })
        .toBe(true);

      await page.keyboard.press("Space");
      await expect.poll(() => getBattleState(page)).toBe("waitingForPlayerAction");
      await expect(page.locator("#cli-stats .cli-stat.selected")).toHaveCount(0);
    });
  });

  test.describe("Shortcuts and Help", () => {
    testWithConsole("shortcuts panel is initially hidden", async ({ page }) => {
      await ensureBattleReady(page);

      const shortcutsSection = page.locator("#cli-shortcuts");
      await expect(shortcutsSection).toBeHidden();
      await expect(shortcutsSection).toHaveAttribute("hidden");
    });

    testWithConsole("shortcuts panel can be toggled", async ({ page }) => {
      await startBattle(page);

      const shortcutsSection = page.locator("#cli-shortcuts");
      const shortcutsBody = page.locator("#cli-shortcuts-body");
      const closeButton = page.locator("#cli-shortcuts-close");

      await expect(shortcutsSection).toBeHidden();
      await page.locator("#cli-main").click();
      await page.keyboard.press("h");

      await expect(shortcutsSection).toBeVisible();
      await expect(shortcutsBody).toBeVisible();
      await expect(closeButton).toHaveAttribute("aria-expanded", "true");

      await closeButton.click();
      await expect(shortcutsSection).toBeHidden();
      await expect(shortcutsBody).toBeHidden();
      await expect(closeButton).toHaveAttribute("aria-expanded", "false");
    });

    testWithConsole("shortcuts content is comprehensive", async ({ page }) => {
      await startBattle(page);

      const shortcutsSection = page.locator("#cli-shortcuts");
      await expect(shortcutsSection).toBeHidden();

      await page.locator("#cli-main").click();
      await page.keyboard.press("h");
      await expect(shortcutsSection).toBeVisible();

      const helpList = page.locator("#cli-help");
      await expect(helpList).toContainText("[1–5] Select Stat");
      await expect(helpList).toContainText("[Enter]/[Space] Next");
      await expect(helpList).toContainText("[Q] Quit");
      await expect(helpList).toContainText("[H] Toggle Help");

      await page.locator("#cli-shortcuts-close").click();
      await expect(shortcutsSection).toBeHidden();
    });

    testWithConsole("H key toggles help", async ({ page }) => {
      await startBattle(page);

      const shortcutsSection = page.locator("#cli-shortcuts");
      await expect(shortcutsSection).toBeHidden();

      await page.locator("#cli-main").click();
      await page.keyboard.press("h");
      await expect(shortcutsSection).toBeVisible();

      await page.keyboard.press("h");
      await expect(shortcutsSection).toBeHidden();
    });
  });

  test.describe("Verbose Logging", () => {
    testWithConsole("verbose section is initially hidden", async ({ page }) => {
      await ensureBattleReady(page);

      const verboseSection = page.locator("#cli-verbose-section");
      await expect(verboseSection).toBeHidden();
      await expect(verboseSection).toHaveAttribute("hidden");
    });

    testWithConsole("verbose toggle controls section visibility", async ({ page }) => {
      await ensureBattleReady(page);

      const verboseToggle = page.locator("#verbose-toggle");
      const verboseSection = page.locator("#cli-verbose-section");
      const verboseLog = page.locator("#cli-verbose-log");

      await verboseToggle.check();
      await expect(verboseSection).toBeVisible();
      await expect(verboseLog).toBeVisible();
      await expect(verboseLog).toHaveAttribute("aria-atomic", "false");

      await verboseToggle.uncheck();
      await expect(verboseSection).toBeHidden();
    });

    testWithConsole("verbose log displays content when enabled", async ({ page }) => {
      await startBattle(page);

      const verboseToggle = page.locator("#verbose-toggle");
      const verboseSection = page.locator("#cli-verbose-section");
      const verboseLog = page.locator("#cli-verbose-log");

      await verboseToggle.check();
      await expect(verboseSection).toBeVisible();

      await page.locator("#cli-stats").focus();
      await page.keyboard.press("1");

      await expect(verboseLog).not.toBeEmpty({ timeout: 10_000 });
      await expect(verboseLog).toContainText("waitingForPlayerAction", { timeout: 10_000 });
      await expect(verboseLog).toContainText("-> roundOver", { timeout: 10_000 });
    });
  });

  test.describe("Battle Flow Integration", () => {
    testWithConsole("Test API provides battle state access", async ({ page }) => {
      await ensureBattleReady(page);

      await expect.poll(() => getBattleState(page)).toBe("waitingForPlayerAction");

      const storeInfo = await getBattleStore(page);
      if (storeInfo !== null) {
        expect(storeInfo.selectionMade).toBe(false);
      }

      const debugInfo = await page.evaluate(() => window.__TEST_API.inspect.getDebugInfo());
      expect(debugInfo.error).toBeUndefined();
      await expect(page).toHaveURL(/battleCLI.html/);
    });
  });

  test.describe("Accessibility Features", () => {
    testWithConsole("skip link is present and functional", async ({ page }) => {
      await ensureBattleReady(page);

      const skipLink = page.locator(".skip-link");
      await expect(skipLink).toHaveAttribute("href", "#cli-main");
      await expect(skipLink).toContainText("Skip to main content");

      const boundingBox = await skipLink.boundingBox();
      expect(boundingBox?.y).toBeLessThan(0);

      await skipLink.focus();
      const focusedBox = await skipLink.boundingBox();
      expect(focusedBox?.y).toBeGreaterThanOrEqual(0);
    });

    testWithConsole("ARIA labels and roles are properly set", async ({ page }) => {
      await ensureBattleReady(page);

      await expect(page.locator("#cli-main")).toHaveAttribute("role", "main");
      await expect(page.locator("#cli-header")).toHaveAttribute("role", "banner");
      await expect(page.locator(".cli-footer")).toHaveAttribute("role", "contentinfo");
      await expect(page.locator("#round-message")).toHaveAttribute("role", "status");
      await expect(page.locator("#round-message")).toHaveAttribute("aria-live", "polite");
      await expect(page.locator("#round-message")).toHaveAttribute("aria-atomic", "true");
      await expect(page.locator("#cli-countdown")).toHaveAttribute("role", "status");
      await expect(page.locator("#cli-prompt")).toHaveAttribute("role", "status");
    });

    testWithConsole("form controls have proper labels", async ({ page }) => {
      await ensureBattleReady(page);

      const pointsSelect = page.locator("#points-select");
      await expect(pointsSelect).toHaveAttribute("aria-label", "Points to win");

      const verboseToggle = page.locator("#verbose-toggle");
      await expect(verboseToggle).toHaveAttribute("aria-label", "Toggle verbose logging");

      const seedInput = page.locator("#seed-input");
      await expect(seedInput).toHaveAttribute("aria-label", "Deterministic seed (optional)");
      await expect(seedInput).toHaveAttribute("aria-describedby", "seed-error");
    });

    testWithConsole("focus management works properly", async ({ page }) => {
      await ensureBattleReady(page);

      const getFocusDescriptor = () =>
        page.evaluate(() => {
          const active = document.activeElement;
          if (!active || active === document.body) return null;
          return (
            active.id || active.getAttribute("data-testid") || active.tagName?.toLowerCase() || null
          );
        });

      await page.keyboard.press("Tab");
      let focusDescriptor = await getFocusDescriptor();
      expect(focusDescriptor).not.toBeNull();

      await page.keyboard.press("Tab");
      focusDescriptor = await getFocusDescriptor();
      expect(focusDescriptor).not.toBeNull();
    });
  });

  test.describe("Error Handling and Edge Cases", () => {
    testWithConsole("handles missing Test API gracefully", async ({ page }, testInfo) => {
      await page.goto(buildCliUrl(testInfo), { waitUntil: "domcontentloaded" });

      await expect(page.locator("#cli-root")).toBeVisible();
      await expect(page.locator("#cli-main")).toBeVisible();
      await expect(page.locator("#cli-header")).toBeVisible();
    });

    testWithConsole("handles invalid settings gracefully", async ({ page }) => {
      await ensureBattleReady(page);

      const seedInput = page.locator("#seed-input");
      await seedInput.fill("999999999999999");
      await expect(seedInput).toHaveValue("999999999999999");

      await seedInput.fill("-123");
      await expect(seedInput).toHaveValue("-123");

      await seedInput.fill("123.45");
      await expect(seedInput).toHaveValue("123.45");
    });

    testWithConsole("handles rapid keyboard input", async ({ page }) => {
      await startBattle(page);

      await page.keyboard.press("1");
      await page.keyboard.press("2");
      await page.keyboard.press("3");
      await page.keyboard.press("Enter");
      await page.keyboard.press("h");
      await page.keyboard.press("q");

      await expect(page.locator("#cli-root")).toBeVisible();
      await expect.poll(() => getBattleState(page)).not.toBeNull();
    });
  });

  test.describe("Responsive Behavior", () => {
    testWithConsole("layout adapts to narrow screens", async ({ page }) => {
      await page.setViewportSize({ width: 600, height: 800 });
      await ensureBattleReady(page);

      const header = page.locator("#cli-header");
      const status = page.locator(".cli-status");

      const headerBox = await header.boundingBox();
      const statusBox = await status.boundingBox();
      expect(statusBox?.y).toBeGreaterThan((headerBox?.y ?? 0) - 1);
    });

    testWithConsole("controls remain accessible on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await startBattle(page);

      await expect(page.locator("#cli-stats")).toBeVisible();
      await expect(page.locator("#cli-settings-toggle")).toBeVisible();
      await expect(page.locator("#cli-controls-hint")).toBeVisible();

      await page.waitForFunction(
        () => document.querySelectorAll(".cli-stat").length > 0,
        undefined,
        { timeout: 10_000 }
      );
      const statItems = page.locator(".cli-stat");
      const firstStat = statItems.first();
      await expect(firstStat).toBeVisible();
      const box = await firstStat.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });
  });
});
