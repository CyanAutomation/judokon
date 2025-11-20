import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Button Listener Test", () => {
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
  });

  test("check if click listeners are attached", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Verify the listener registry was created and has correct stats
    const listenerSnapshot = await page.evaluate(() => {
      const inspectApi = window.__TEST_API?.inspect;
      return inspectApi?.getStatButtonListenerSnapshot?.() ?? null;
    });

    expect(listenerSnapshot, "stat button listener snapshot should be available").toBeTruthy();
    expect(listenerSnapshot.available).toBe(true);
    expect(listenerSnapshot.buttonCount).toBeGreaterThan(0);
    expect(listenerSnapshot.attachedCount).toBe(listenerSnapshot.buttonCount);
    expect(listenerSnapshot.stats.length).toBe(listenerSnapshot.buttonCount);

    // Verify the stats match what we expect (power, speed, technique, kumikata, newaza)
    const expectedStats = ["power", "speed", "technique", "kumikata", "newaza"];
    expectedStats.forEach((stat) => {
      expect(listenerSnapshot.stats).toContain(stat);
    });

    // Verify each detail entry has required properties
    listenerSnapshot.details.forEach((detail) => {
      expect(detail.stat).toBeTruthy();
      expect(detail.datasetStat).toBeTruthy();
      expect(detail.stat).toBe(detail.datasetStat);
    });
  });
});
