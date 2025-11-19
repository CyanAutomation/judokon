import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady } from "./helpers/battleStateHelper.js";

test("Debug opponent choosing - minimal", async ({ page }) => {
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

  console.log("\n=== After navigation ===");
  const modalCheck = await page.evaluate(() => ({
    hasModal: document.querySelector("dialog[open]") !== null,
    modalText: document.querySelector("dialog")?.textContent || "no modal",
    url: window.location.href
  }));
  console.log(JSON.stringify(modalCheck, null, 2));

  // Try to use the helper that works in auto-advance
  try {
    await waitForBattleReady(page, { allowFallback: true });
    console.log("\n✓ waitForBattleReady succeeded");
  } catch (error) {
    console.log("\n✗ waitForBattleReady failed:", error.message);
  }

  // Check state again
  const state = await page.evaluate(() => ({
    testApi: typeof window.__TEST_API !== "undefined",
    currentState: window.__TEST_API?.state?.getBattleState?.(),
    bodyDataState: document.body?.dataset?.battleState
  }));
  console.log("\n=== Final state ===");
  console.log(JSON.stringify(state, null, 2));
});
