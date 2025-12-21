import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Button Identity Check", () => {
  test.skip("skip verbose debug tests", () => {});

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal when present
    const mediumButton = page.getByRole("button", { name: "Medium" });
    if ((await mediumButton.count()) > 0) {
      await expect(mediumButton).toBeVisible();
      await mediumButton.click();
    }
  });

  test("check if button element is replaced", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Capture the rendered button identity via the test API
    const initialSnapshot = await page.evaluate(() =>
      window.__TEST_API.inspect.getStatButtonSnapshot({ refresh: true })
    );
    console.log("Initial stat button snapshot:", JSON.stringify(initialSnapshot, null, 2));

    expect(initialSnapshot.buttons.length).toBeGreaterThan(0);
    const trackedButton = initialSnapshot.buttons[0];

    // Confirm readiness via deterministic helper
    const stableSnapshot = await page.evaluate(async () => {
      await window.__TEST_API.state.waitForStatButtonsReady();
      return window.__TEST_API.inspect.getStatButtonSnapshot();
    });

    console.log("Stable stat button snapshot:", JSON.stringify(stableSnapshot, null, 2));
    expect(stableSnapshot.buttons[0]?.id).toBe(trackedButton?.id);

    // Check if init functions were called
    const initStatButtonsCalled = await page.evaluate(
      () => window.__initStatButtonsCalled || false
    );
    const renderCalled = await page.evaluate(() => window.__renderStatButtonsCalled || false);
    const clickListenersAttached = await page.evaluate(
      () => window.__clickListenerAttachedFor || []
    );
    console.log("initStatButtons called:", initStatButtonsCalled);
    console.log("renderStatButtons called:", renderCalled);
    console.log("Click listeners attached for stats (renderStatButtons):", clickListenersAttached);

    // Now click the button
    await statButtons.first().click();

    const snapshotAfterClick = await page.evaluate(async () => {
      await window.__TEST_API.state.waitForBattleState("roundDecision");
      return window.__TEST_API.inspect.getStatButtonSnapshot({ refresh: true });
    });

    console.log(
      "Snapshot after click:",
      JSON.stringify({ before: trackedButton, after: snapshotAfterClick.buttons[0] }, null, 2)
    );

    const appHandlerCalled = await page.evaluate(() => window.__statButtonClickCalled || false);
    const uiHelpersHandlerCalled = await page.evaluate(
      () => window.__statButtonClickHandlerTriggered || false
    );
    const selectStatCalledDisable = await page.evaluate(
      () => window.__selectStatCalledDisable || false
    );
    const disableStatButtonsCalled = await page.evaluate(
      () => window.__disableStatButtonsCalled || false
    );
    const disableCount = await page.evaluate(() => window.__disableStatButtonsCount || 0);

    console.log("App click handler called (battleClassic.init.js):", appHandlerCalled);
    console.log("UIHelpers click handler called (uiHelpers.js):", uiHelpersHandlerCalled);
    console.log("selectStat called disableStatButtons:", selectStatCalledDisable);
    console.log("disableStatButtons function called:", disableStatButtonsCalled);
    console.log("Number of buttons passed to disableStatButtons:", disableCount);

    // Check if button is still the same after click
    expect(snapshotAfterClick.buttons[0]?.id).toBe(trackedButton?.id);
  });
});
