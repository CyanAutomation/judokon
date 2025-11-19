import { test, expect } from "./fixtures/commonSetup.js";

test("Debug opponent choosing flow", async ({ page }) => {
  await page.goto("/index.html");

  await Promise.all([
    page.waitForURL("**/battleClassic.html"),
    (async () => {
      const startBtn =
        (await page.$('[data-testid="start-classic"]')) ||
        (await page.getByText("Classic Battle").first());
      await startBtn.click();
    })()
  ]);

  // Check what's available
  const state1 = await page.evaluate(() => ({
    testApi: typeof window.__TEST_API !== "undefined",
    stateApi: typeof window.__TEST_API?.state !== "undefined",
    getBattleState: typeof window.__TEST_API?.state?.getBattleState === "function",
    currentState: window.__TEST_API?.state?.getBattleState?.(),
    battleStore: typeof window.battleStore !== "undefined"
  }));

  console.log("\n=== State after navigation ===");
  console.log(JSON.stringify(state1, null, 2));

  // Wait for stat buttons to render
  const firstStat = page.locator("#stat-buttons button").first();
  await expect(firstStat).toBeVisible();
  console.log("\n✓ Stat buttons visible");

  // Check state again
  const state2 = await page.evaluate(() => ({
    currentState: window.__TEST_API?.state?.getBattleState?.(),
    bodyDataState: document.body?.dataset?.battleState
  }));
  console.log("\n=== State after stat buttons visible ===");
  console.log(JSON.stringify(state2, null, 2));

  // Check what happens after waiting with a shorter timeout
  const foundWaiting = await page
    .waitForFunction(
      () => {
        const state = window.__TEST_API?.state?.getBattleState?.();
        const result = state === "waitingForPlayerAction";
        if (!result) {
          console.log("Current state:", state);
        }
        return result;
      },
      { timeout: 5000 }
    )
    .catch(() => {
      console.log("\n✗ waitForFunction timed out");
      return false;
    });

  console.log("\n=== Found waiting state:", foundWaiting, "===");
});
