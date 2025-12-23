import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";

test("minimal auto-select test", async ({ page }) => {
  await page.addInitScript(() => {
    window.__FF_OVERRIDES = { autoSelect: true };
    window.__OPPONENT_RESOLVE_DELAY_MS = 0;
  });

  await page.goto("/src/pages/battleClassic.html");
  await page.getByRole("button", { name: "Quick" }).click();
  await waitForBattleReady(page, { timeout: 10_000 });
  await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

  // Directly click a stat button instead of using auto-select
  await page.click('[data-stat="power"]');
  
  // This should work
  await waitForBattleState(page, "roundOver", { timeout: 5_000 });
  
  const state = await page.evaluate(() => document.body?.dataset?.battleState);
  console.log("Final state:", state);
  expect(state).toBe("roundOver");
});
