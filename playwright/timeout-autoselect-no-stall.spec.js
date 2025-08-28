import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./fixtures/waits.js";

test.describe("Timeout autoselect does not stall", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Keep default timers, but ensure cooldown is minimal for quick assertions
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });
  });

  test("trigger timeout → round resolves → cooldown → next round", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    // Choose a round length to start the match
    await page.locator("#round-select-1").click();
    await waitForBattleReady(page);

    // Use in-page test hook to trigger timeout immediately instead of waiting 30s
    await page.evaluate(async () => {
      const mod = await import("/src/helpers/classicBattle/testHooks.js");
      await mod.ensureBindings({ force: true });
      const store = window.battleStore;
      await mod.triggerRoundTimeoutNow(store);
    });

    // Expect machine to have proceeded through roundDecision to cooldown, then restart
    await waitForBattleState(page, "cooldown", 5000);
    // And then back to waiting for input for the next round
    await waitForBattleState(page, "waitingForPlayerAction", 10000);

    // Sanity: stat buttons enabled again
    await expect(
      page.locator("#stat-buttons button").first()
    ).toBeEnabled({ timeout: 5000 });
  });
});

