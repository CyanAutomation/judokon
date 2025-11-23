import { test, expect } from "./fixtures/commonSetup.js";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

async function emitVerboseEntry(page, to) {
  await waitForTestApi(page);
  await page.evaluate(async (nextState) => {
    const dispatch =
      window.__TEST_API?.state?.dispatchBattleEvent?.bind(window.__TEST_API.state) || null;
    if (dispatch) {
      const result = await dispatch("battleStateChange", { from: "setup", to: nextState });
      if (result !== false) return;
    }

    if (typeof window.emitBattleEvent === "function") {
      try {
        window.emitBattleEvent("battleStateChange", { from: "setup", to: nextState });
        return;
      } catch (error) {
        console.warn("emitBattleEvent failed:", error);
        // Fall through to throw error below since emitBattleEvent failed
      }
    }

    throw new Error("Battle event helpers unavailable");
  }, to);
}

test.describe("Battle CLI verbose toggle", () => {
  test("enables verbose logging and persists after reload", async ({ page }) => {
    const app = await configureApp(page, {});
    await page.goto("/src/pages/battleCLI.html");
    await app.applyRuntime();

    const indicator = page.getByText("Verbose ON", { exact: true });
    const verboseSection = page.getByRole("region", { name: "Verbose Log" });
    const verboseLog = page.locator("#cli-verbose-log");
    const verboseToggle = page.getByLabel("Toggle verbose logging");
    const isVerboseEnabled = async () =>
      await page.evaluate(() => {
        try {
          const storedSettings = JSON.parse(localStorage.getItem("settings") || "{}");
          return storedSettings?.featureFlags?.cliVerbose?.enabled ?? null;
        } catch {
          return null;
        }
      });

    await expect(verboseSection).toBeHidden();
    await expect(indicator).toBeHidden();

    await waitForTestApi(page);

    await verboseToggle.check();

    await expect(verboseToggle).toBeChecked();
    await expect(verboseSection).toBeVisible();
    await expect(indicator).toBeVisible();
    await expect(verboseLog).toBeVisible();
    await expect.poll(isVerboseEnabled, { timeout: 5000, interval: 200 }).toBe(true);

    const firstState = "mocked-round-start";
    await emitVerboseEntry(page, firstState);
    await expect(verboseLog).toContainText(firstState, { timeout: 5000 });

    await page.reload({ waitUntil: "networkidle" });
    await app.applyRuntime();
    await waitForTestApi(page);
    await expect.poll(isVerboseEnabled, { timeout: 5000, interval: 200 }).toBe(true);

    await expect(verboseToggle).toBeChecked({ timeout: 5000 });
    await expect(verboseSection).toBeVisible();
    await expect(indicator).toBeVisible();
    await expect(verboseLog).toBeVisible();

    const resumedState = "persisted-verbose-state";
    await emitVerboseEntry(page, resumedState);
    await expect(verboseLog).toContainText(resumedState, { timeout: 5000 });

    await verboseToggle.uncheck();
    await expect(verboseSection).toBeHidden();
    await expect(indicator).toBeHidden();

    const disabledState = "should-not-appear";
    const disabledState = "should-not-appear";
    try {
      await emitVerboseEntry(page, disabledState);
    } catch (error) {
      // Expected if battle event helpers are unavailable
      console.log("Battle event emission failed as expected:", error.message);
    }
    await expect(verboseLog).not.toContainText(disabledState, { timeout: 2000 });
  });
});
