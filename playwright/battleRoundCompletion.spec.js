import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady } from "./fixtures/waits.js";

test.describe("Classic battle round completion", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: false } } })
      );
    });
  });

  test("plays a round to completion without hanging", async ({ page }) => {
    page.on("console", (msg) => console.log(msg.text()));

    await page.goto("/src/pages/battleJudoka.html?autostart=1");

    await waitForBattleReady(page);

    // 1. Wait for the stat buttons to be enabled
    await expect(page.locator("#stat-buttons button").first()).toBeEnabled({ timeout: 10000 });

    // 2. Click a stat button
    await page.locator("button[data-stat='power']").click();

    // 3. Wait for the stat buttons to be disabled (indicating the round is processing)
    await page.locator("#stat-buttons[data-buttons-ready='false']").waitFor();

    // Pause header timers/animation to help teardown complete quickly in CI
    await page.evaluate(() => window.freezeBattleHeader?.());
  });
});
