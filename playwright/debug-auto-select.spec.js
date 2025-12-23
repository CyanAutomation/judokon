import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";
import { triggerAutoSelect } from "./helpers/autoSelectHelper.js";
import { withMutedConsole } from "../tests/utils/console.js";

test("debug auto-select state transitions", async ({ page }) =>
  withMutedConsole(async () => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateProgress: true,
        showRoundSelectModal: true,
        autoSelect: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");
    await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
    await page.getByRole("button", { name: "Quick" }).click();

    await waitForBattleReady(page, { timeout: 10_000 });

    const progress = page.getByTestId("battle-state-progress");
    await expect
      .poll(async () => progress.getAttribute("data-feature-battle-state-ready"))
      .toBe("true");

    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

    console.log(
      "Current state before triggerAutoSelect:",
      await page.evaluate(() => document.body?.dataset?.battleState)
    );

    const result = await triggerAutoSelect(page, 10_000, true, true);
    console.log("triggerAutoSelect result:", result);

    if (!result.success) {
      throw new Error(`Failed to trigger auto-select: ${result.error}`);
    }

    // Wait a bit and check the state
    await page.waitForTimeout(500);
    console.log(
      "State after triggerAutoSelect + 500ms:",
      await page.evaluate(() => document.body?.dataset?.battleState)
    );

    await page.waitForTimeout(1000);
    console.log(
      "State after triggerAutoSelect + 1500ms:",
      await page.evaluate(() => document.body?.dataset?.battleState)
    );

    await page.waitForTimeout(2000);
    console.log(
      "State after triggerAutoSelect + 3500ms:",
      await page.evaluate(() => document.body?.dataset?.battleState)
    );

    // Check if state machine is stuck
    const stateInfo = await page.evaluate(() => ({
      bodyState: document.body?.dataset?.battleState,
      testApiState: window.__TEST_API?.state?.getCurrentState?.(),
      testApiAvailable: !!window.__TEST_API?.state,
      autoSelectAvailable: !!window.__TEST_API?.autoSelect
    }));
    console.log("State info:", stateInfo);

    // Try waiting for roundOver with extended timeout
    try {
      await waitForBattleState(page, "roundOver", { timeout: 5_000 });
      console.log("Successfully transitioned to roundOver");
    } catch (e) {
      console.error("Failed to transition to roundOver:", e.message);
      const finalState = await page.evaluate(() => document.body?.dataset?.battleState);
      console.log("Final state:", finalState);
      throw e;
    }
  }, ["log", "info", "warn", "error", "debug"]));
