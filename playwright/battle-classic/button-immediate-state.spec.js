import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Immediate Button State", () => {
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

  test("check button state immediately before and during click", async ({ page }) => {
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    const initialSnapshot = await page.evaluate(() =>
      window.__TEST_API.inspect.getStatButtonSnapshot({ refresh: true })
    );
    expect(initialSnapshot.buttons.length).toBeGreaterThan(0);

    const trackedButton = initialSnapshot.buttons[0];
    if (!trackedButton) {
      throw new Error("No stat buttons found in snapshot");
    }
    const trackedStat = trackedButton.stat;
    expect(trackedStat).toBeTruthy();
    expect(trackedButton.disabled).toBe(false);

    const baselineEventId = await page.evaluate(() => {
      const api = window.__TEST_API?.statButtons;
      if (!api || typeof api.getLastEvent !== "function") {
        throw new Error("Stat button event API unavailable");
      }
      const last = api.getLastEvent();
      return typeof last?.id === "number" ? last.id : 0;
    });

    const handlerPromise = page.evaluate(
      ({ afterId }) => {
        const api = window.__TEST_API?.statButtons;
        if (!api || typeof api.waitForHandler !== "function") {
          throw new Error("Stat button handler wait unavailable");
        }
        return api.waitForHandler({ afterId, timeout: 2000 });
      },
      { afterId: baselineEventId }
    );

    const disablePromise = page.evaluate(
      ({ afterId }) => {
        const api = window.__TEST_API?.statButtons;
        if (!api || typeof api.waitForDisable !== "function") {
          throw new Error("Stat button disable wait unavailable");
        }
        return api.waitForDisable({ afterId, timeout: 2000 });
      },
      { afterId: baselineEventId }
    );

    await statButtons.first().click();

    const [handlerEvent, disableEvent] = await Promise.all([handlerPromise, disablePromise]);
    // Accept any valid post-selection state (handles skipRoundCooldown flag)
    await waitForBattleState(page, ["cooldown", "roundStart", "waitingForPlayerAction"]);

    expect(handlerEvent?.type).toBe("handler");
    expect(handlerEvent?.detail?.stat).toBe(trackedStat);
    expect(typeof handlerEvent?.detail?.label).toBe("string");

    expect(disableEvent?.type).toBe("disabled");
    expect(disableEvent?.detail?.count).toBeGreaterThan(0);
    if (Array.isArray(disableEvent?.detail?.stats)) {
      expect(disableEvent.detail.stats).toContain(trackedStat);
    }

    const snapshotAfterClick = await page.evaluate(() =>
      window.__TEST_API.inspect.getStatButtonSnapshot({ refresh: true })
    );
    const buttonAfterClick = snapshotAfterClick.buttons.find((btn) => btn.stat === trackedStat);
    if (!buttonAfterClick) {
      throw new Error(`Button with stat "${trackedStat}" not found in post-click snapshot`);
    }
    expect(buttonAfterClick.disabled).toBe(true);
  });
});
