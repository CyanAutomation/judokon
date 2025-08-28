import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady } from "./fixtures/waits.js";

test.describe("Classic battle round completion", () => {
  test("plays a round to completion without hanging", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html?autostart=1");

    // Wait for the battle to be ready
    await waitForBattleReady(page);

    // Wait for the stat buttons to be enabled
    await page.waitForFunction(() => {
      const statButtons = document.querySelectorAll("#stat-buttons button");
      return Array.from(statButtons).every(btn => !btn.disabled);
    }, null, { timeout: 10000 });

    // Select the first stat
    await page.locator("button[data-stat='power']").click();

    // Wait for the round to be resolved and the "Next round in: Xs" snackbar to appear
    await expect(page.locator(".snackbar")).toHaveText(/Next round in: \d+s/, { timeout: 10000 });

    // Wait for the cooldown to finish and the next round to start, by waiting for the stat buttons to be enabled again
    await page.waitForFunction(() => {
      const statButtons = document.querySelectorAll("#stat-buttons button");
      return Array.from(statButtons).every(btn => !btn.disabled);
    }, null, { timeout: 10000 });

  });
});