import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Button State Timeline", () => {
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

  test("track button disabled state timeline", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Record the current stat-button event id so we can slice the timeline later
    const baselineEventId = await page.evaluate(() => {
      const api = window.__TEST_API?.statButtons;
      if (!api?.getLastEvent) {
        throw new Error("Stat button Test API unavailable");
      }
      const lastEvent = api.getLastEvent();
      return lastEvent && typeof lastEvent.id === "number" ? lastEvent.id : 0;
    });

    // Click the button
    await statButtons.first().click();

    // Wait for the stat buttons to report their disabled event through the Test API
    const disableEvent = await page.evaluate(async (afterId) => {
      const api = window.__TEST_API?.statButtons;
      if (!api?.waitForDisable) {
        throw new Error("waitForDisable unavailable on stat button Test API");
      }
      return api.waitForDisable({ timeout: 2_000, afterId });
    }, baselineEventId);

    // Allow the battle flow to reach cooldown instead of relying on arbitrary timeouts
    await waitForBattleState(page, "cooldown");

    // Get the timeline
    const timeline = await page.evaluate((afterId) => {
      const api = window.__TEST_API?.statButtons;
      if (!api?.getHistory) {
        return [];
      }
      return api
        .getHistory({ limit: 20 })
        .filter((event) => event && typeof event?.id === "number" && event.id > afterId);
    }, baselineEventId);

    console.log("Stat button event timeline:");
    timeline.forEach((entry, i) => {
      console.log(`${i}: [${entry.type}]`, JSON.stringify(entry.detail));
    });

    expect(disableEvent).toBeDefined();
    expect(disableEvent.timedOut).toBe(false);
    expect(timeline.some((event) => event.type === "disabled")).toBe(true);
    await expect(statButtons.first()).toBeDisabled();
  });
});
