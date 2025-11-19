import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState, waitForStatButtonsReady } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Immediate Button State After Click", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();

    await page.waitForFunction(() => {
      const api = window.__TEST_API;
      if (!api) return false;
      const statButtonsReady = !!api.statButtons?.waitForHandler;
      const inspectorReady = typeof api.inspect?.getStatButtonSnapshot === "function";
      const stateHelpersReady = typeof api.state?.waitForStatButtonsReady === "function";
      return statButtonsReady && inspectorReady && stateHelpersReady;
    }, { timeout: 10000 });
  });

  test("button state check", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await waitForStatButtonsReady(page);
    await expect(statButtons.first()).toBeEnabled();

    const baselineDiagnostics = await page.evaluate(() => {
      const api = window.__TEST_API;
      const statButtonsApi = api?.statButtons;
      const inspectApi = api?.inspect;
      const lastEvent = statButtonsApi?.getLastEvent?.() ?? null;
      return {
        lastEventId: typeof lastEvent?.id === "number" ? lastEvent.id : 0,
        history: statButtonsApi?.getHistory?.({ limit: 5 }) ?? [],
        snapshot: inspectApi?.getStatButtonSnapshot?.() ?? null
      };
    });

    console.log(
      "Baseline stat-button readiness:",
      JSON.stringify(baselineDiagnostics, null, 2)
    );

    // Click and check IMMEDIATELY
    await statButtons.first().click();

    const immediateSnapshot = await page.evaluate(() => {
      return window.__TEST_API?.inspect?.getStatButtonSnapshot?.({ refresh: true }) ?? null;
    });

    console.log("Immediate snapshot:", JSON.stringify(immediateSnapshot, null, 2));

    if (!immediateSnapshot) {
      throw new Error("Failed to get immediate snapshot from __TEST_API");
    }
    const primaryButton = immediateSnapshot?.buttons?.[0] ?? null;
    expect(primaryButton?.disabled).toBe(true);

    const afterId = typeof baselineDiagnostics.lastEventId === "number" ? baselineDiagnostics.lastEventId : 0;
    const eventResults = await page.evaluate(async ({ afterId: id }) => {
      const api = window.__TEST_API?.statButtons;
      if (!api) {
        return { handler: null, disable: null, history: [] };
      }
      const handler = await api.waitForHandler({ timeout: 2000, afterId: id });
      const disable = await api.waitForDisable({ timeout: 2000, afterId: handler?.id ?? id });
      return {
        handler,
        disable,
        history: api.getHistory({ limit: 10 }) ?? []
      };
    }, { afterId });

    expect(eventResults.handler).toBeTruthy();
    expect(eventResults.handler?.timedOut).toBe(false);
    expect(eventResults.disable).toBeTruthy();
    expect(eventResults.disable?.timedOut).toBe(false);

    console.log("Handler + disable events:", JSON.stringify(eventResults, null, 2));

    const finalSnapshot = await page.evaluate(() => {
      const api = window.__TEST_API;
      return {
        currentState: api?.state?.getBattleState?.() ?? null,
        statButtons: api?.inspect?.getStatButtonSnapshot?.({ refresh: true }) ?? null,
        stateSnapshot: api?.state?.getStateSnapshot?.() ?? null,
        debugInfo: api?.inspect?.getDebugInfo?.() ?? null
      };
    });

    console.log("Final diagnostics:", JSON.stringify(finalSnapshot, null, 2));

    await expect(statButtons.first()).toBeDisabled();
  });
});
