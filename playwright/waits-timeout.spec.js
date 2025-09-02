import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./fixtures/waits.js";

test("waitForBattleState rejects when state isn't reached", async ({ page }) => {
  await page.goto("/src/pages/battleJudoka.html?autostart=1");
  await waitForBattleReady(page);
  const targetState = "neverAppears";
  await expect(waitForBattleState(page, targetState, 100)).rejects.toThrow(
    `Timed out waiting for battle state "${targetState}"`
  );
});
