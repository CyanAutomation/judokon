import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";
import { triggerAutoSelect } from "./helpers/autoSelectHelper.js";
import { withMutedConsole } from "../tests/utils/console.js";

test("debug triggerAutoSelect", async ({ page }) =>
  withMutedConsole(async () => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateProgress: true,
        showRoundSelectModal: true,
        autoSelect: true
      };
      window.__OPPONENT_RESOLVE_DELAY_MS = 0;
    });

    await page.goto("/src/pages/battleClassic.html");
    await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
    await page.getByRole("button", { name: "Quick" }).click();

    await waitForBattleReady(page, { timeout: 10_000 });
    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

    // Check Test API availability
    const apiCheck = await page.evaluate(() => ({
      hasTestApi: !!window.__TEST_API,
      hasAutoSelect: !!window.__TEST_API?.autoSelect,
      hasTrigger: !!window.__TEST_API?.autoSelect?.triggerAutoSelect,
      storeAvailable: !!window.__TEST_API?.inspection?.getBattleStore?.()
    }));
    console.log("API Check:", JSON.stringify(apiCheck, null, 2));

    if (!apiCheck.hasTrigger) {
      throw new Error("triggerAutoSelect not available on Test API");
    }

    const result = await triggerAutoSelect(page, 10_000, true, true); // Enable debug
    console.log("triggerAutoSelect result:", JSON.stringify(result, null, 2));
    
    if (!result.success) {
      throw new Error(`Failed to trigger auto-select: ${result.error}`);
    }

    // Check state immediately
    const stateAfter = await page.evaluate(() => document.body?.dataset?.battleState);
    console.log("State after triggerAutoSelect:", stateAfter);

    // Wait a bit and check again
    await page.waitForTimeout(500);
    const stateAfter2 = await page.evaluate(() => document.body?.dataset?.battleState);
    console.log("State after 500ms:", stateAfter2);
  }, ["log", "info", "warn", "error", "debug"]));
