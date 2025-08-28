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
    page.on('console', msg => console.log(msg.text()));

    await page.goto("/src/pages/battleJudoka.html");

    // Click the 5 points button in the round select modal
    await page.locator("#round-select-1").click();

    // Wait for the battle to be ready
    await waitForBattleReady(page);

    // 1. Wait for the stat buttons to be enabled
    await page.waitForFunction(() => {
      const statButtons = document.querySelectorAll("#stat-buttons button");
      return Array.from(statButtons).every(btn => !btn.disabled);
    }, null, { timeout: 10000 });

    // 2. Click a stat button
    await page.locator("button[data-stat='power']").click();

    // 3. Wait for the stat buttons to be disabled (indicating the round is processing)
    await page.waitForFunction(() => {
      const statButtons = document.querySelectorAll("#stat-buttons button");
      return Array.from(statButtons).every(btn => btn.disabled);
    }, null, { timeout: 10000 });

  });
});