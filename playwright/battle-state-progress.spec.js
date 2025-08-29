import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady } from "./fixtures/waits.js";
import { classicBattleStates } from "./fixtures/classicBattleStates.js";

test.describe("Battle state progress", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.42;
    });
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator("#round-select-1").click();
    await waitForBattleReady(page);
  });

  test("progress ids match classicBattleStates", async ({ page }) => {
    const expectedIds = classicBattleStates
      .filter((s) => s.id < 90)
      .sort((a, b) => a.id - b.id)
      .map((s) => String(s.id));
    await page.evaluate(() => window.battleStateProgressReadyPromise);
    const ids = await page.$$eval("#battle-state-progress li", (lis) =>
      lis.map((li) => li.textContent.trim())
    );
    expect(ids).toEqual(expectedIds);
  });
});
