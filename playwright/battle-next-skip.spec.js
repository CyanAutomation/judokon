import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady } from "./fixtures/waits.js";

/**
 * Verify that clicking Next during cooldown skips the delay.
 *
 * @pseudocode
 * 1. Set a short next-round cooldown.
 * 2. Start a battle, select the first stat to end round 1.
 * 3. Click Next as soon as it is enabled.
 * 4. Expect the round counter to show round 2 within 1s.
 */
test.describe("Next button cooldown skip", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
      const settings = JSON.parse(localStorage.getItem("settings") || "{}");
      settings.featureFlags = {
        ...(settings.featureFlags || {}),
        skipRoundCooldown: { enabled: false }
      };
      localStorage.setItem("settings", JSON.stringify(settings));
    });
  });

  test("advances immediately when clicked", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html?autostart=1");
    await waitForBattleReady(page);

    // Finish round 1 quickly.
    await page.locator("#stat-buttons button").first().click();
    await page.locator("#stat-buttons[data-buttons-ready='false']").waitFor();
    await page.evaluate(() => window.getRoundResolvedPromise?.());

    const counter = page.locator("#round-counter");
    await expect(counter).toHaveText(/Round 1/);

    const nextBtn = page.locator('[data-role="next-round"]');
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await expect(counter).toHaveText(/Round 2/, { timeout: 1000 });
    await page.evaluate(() => window.freezeBattleHeader?.());
  });
});
