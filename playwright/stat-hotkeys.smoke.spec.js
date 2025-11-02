import { test, expect } from "./fixtures/commonSetup.js";
import { configureApp } from "./fixtures/appConfig.js";

test.describe("Classic Battle – stat hotkeys", () => {
  test("pressing '1' selects the first stat", async ({ page }) => {
    const app = await configureApp(page, {
      featureFlags: { statHotkeys: true }
    });
    await page.goto("/index.html");
    await app.applyRuntime();

    const startBtn =
      (await page.$('[data-testid="start-classic"]')) ||
      (await page.getByText("Classic Battle").first());
    await startBtn.click();

    // Wait for stat buttons to render
    const firstStat = page.locator("#stat-buttons button").first();
    await expect(firstStat).toBeVisible();

    // Focus body and press '1'
    await page.focus("body");
    await page.keyboard.press("1");

    // After selection, Next should eventually become usable (cooldown triggers)
    const nextBtn = page.locator('#next-button, [data-role="next-round"]');
    await expect(nextBtn).toBeVisible();

    // Selection should disable buttons; check the first is disabled or container marked
    const disabledOrMarked = await firstStat.isDisabled().catch(() => false);
    // If button isn't natively disabled, assert some UI changed: scoreboard or snackbar
    if (!disabledOrMarked) {
      const snackbar = page.locator("#snackbar-container .snackbar");
      await expect(snackbar).toBeVisible({ timeout: 3000 });
    }
  });
});
