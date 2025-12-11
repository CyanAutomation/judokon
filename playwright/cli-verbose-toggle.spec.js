import { test, expect } from "./fixtures/commonSetup.js";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForBattleState } from "./helpers/battleStateHelper.js";

const BATTLE_CLI_URL = "/src/pages/battleCLI.html";

async function loadBattleCli(page) {
  const app = await configureApp(page, {});

  await page.goto(BATTLE_CLI_URL);
  await app.applyRuntime();

  const indicator = page.getByText("Verbose ON", { exact: true });
  const verboseSection = page.getByRole("region", { name: "Verbose Log" });
  const verboseLog = page.locator("#cli-verbose-log");
  const verboseToggle = page.getByLabel("Toggle verbose logging");

  return { app, indicator, verboseSection, verboseLog, verboseToggle };
}

const isVerboseEnabled = async (page) =>
  await page.evaluate(() => {
    try {
      const storedSettings = JSON.parse(localStorage.getItem("settings") || "{}");
      return storedSettings?.featureFlags?.cliVerbose?.enabled ?? null;
    } catch (error) {
      console.warn("Failed to read verbose settings from localStorage:", error);
      return null;
    }
  });

async function startMatch(page) {
  await page.keyboard.press("Enter");
  await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_000 });
}

test.describe("Battle CLI verbose toggle", () => {
  test("enables and disables the verbose log UI", async ({ page }) => {
    const { app, indicator, verboseSection, verboseLog, verboseToggle } = await loadBattleCli(page);

    try {
      await expect(verboseSection).toBeHidden();
      await expect(indicator).toBeHidden();

      await verboseToggle.check();

      await expect(verboseToggle).toBeChecked();
      await expect(verboseSection).toBeVisible();
      await expect(indicator).toBeVisible();
      await expect(verboseLog).toBeVisible();

      await verboseToggle.uncheck();

      await expect(verboseToggle).not.toBeChecked();
      await expect(verboseSection).toBeHidden();
      await expect(indicator).toBeHidden();
    } finally {
      await app.cleanup();
    }
  });

  test("persists the verbose preference across reloads", async ({ page }) => {
    const { app, indicator, verboseSection, verboseLog, verboseToggle } = await loadBattleCli(page);

    try {
      await verboseToggle.check();

      await expect.poll(() => isVerboseEnabled(page), { timeout: 5_000, interval: 200 }).toBe(true);
      await expect(verboseSection).toBeVisible();
      await expect(indicator).toBeVisible();

      await page.reload({ waitUntil: "networkidle" });
      await app.applyRuntime();

      await expect.poll(() => isVerboseEnabled(page), { timeout: 5_000, interval: 200 }).toBe(true);
      await expect(verboseToggle).toBeChecked({ timeout: 5_000 });
      await expect(verboseSection).toBeVisible();
      await expect(indicator).toBeVisible();
      await expect(verboseLog).toBeVisible();
    } finally {
      await app.cleanup();
    }
  });

  test("logs battle state transitions from user-driven actions", async ({ page }) => {
    const { app, verboseLog, verboseToggle } = await loadBattleCli(page);

    try {
      await verboseToggle.check();
      await startMatch(page);

      await expect(verboseLog).toContainText("waitingForPlayerAction", { timeout: 7_000 });

      const logText = await verboseLog.textContent();
      expect(logText).toMatch(/\[\d{2}:\d{2}:\d{2}\] .*-> waitingForPlayerAction/);
      expect(logText).toMatch(/roundStart -> waitingForPlayerAction/);
    } finally {
      await app.cleanup();
    }
  });

  test("keeps core CLI interactions responsive while verbose mode is on", async ({ page }) => {
    const { app, verboseToggle } = await loadBattleCli(page);

    try {
      await verboseToggle.check();
      await startMatch(page);

      const controlsHint = page.locator("#cli-controls-hint");
      await expect(controlsHint).toBeVisible();

      const firstStat = page.locator('.cli-stat[data-stat-index="1"]');
      await expect(firstStat).toBeVisible({ timeout: 7_000 });

      await page.keyboard.press("1");

      await expect(firstStat).toHaveAttribute("aria-selected", "true");
    } finally {
      await app.cleanup();
    }
  });
});
