import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

async function subscribeToStatButtonHook(page) {
  await expect
    .poll(async () =>
      page.evaluate(() =>
        typeof window.__TEST_API?.hooks?.statButtons?.onStateChange === "function"
      )
    )
    .toBeTruthy();

  await page.evaluate(() => {
    window.__buttonTimeline = [];
    window.__disposeStatButtonHook?.();
    const hook = window.__TEST_API?.hooks?.statButtons;
    if (!hook || typeof hook.onStateChange !== "function") {
      throw new Error(`Stat button hook unavailable: ${typeof hook?.onStateChange}`);
    }
    window.__disposeStatButtonHook = hook.onStateChange((detail) => {
      if (!Array.isArray(window.__buttonTimeline)) {
        window.__buttonTimeline = [];
      }
      window.__buttonTimeline.push({
        time: detail?.timestamp ?? Date.now(),
        action: detail?.action ?? "unknown",
        stack: detail?.stack ?? null,
        buttonCount: detail?.buttonCount ?? null,
        containerReady: detail?.containerReady ?? null,
        stats: Array.isArray(detail?.stats) ? detail.stats : null
      });
    });
  });
}

test.describe("Classic Battle - Button State Timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
      window.__buttonTimeline = [];
    });
    await page.goto("/src/pages/battleClassic.html");
    await subscribeToStatButtonHook(page);

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.evaluate(() => {
        window.__disposeStatButtonHook?.();
        delete window.__disposeStatButtonHook;
      });
    } catch {}
  });

  test("track button disabled state timeline", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Clear timeline before click
    await page.evaluate(() => {
      window.__buttonTimeline = [];
    });

    // Click the button
    await statButtons.first().click();

    await expect
      .poll(async () => page.evaluate(() => window.__buttonTimeline?.length ?? 0))
      .toBeGreaterThan(0);

    // Get the timeline
    const timeline = await page.evaluate(() => window.__buttonTimeline || []);
    console.log("Button state timeline:");
    timeline.forEach((entry, i) => {
      console.log(`${i}: ${entry.action}`);
      if (entry.buttonCount !== null) {
        console.log(`buttonCount=${entry.buttonCount}`);
      }
      if (Array.isArray(entry.stats) && entry.stats.length > 0) {
        console.log(`stats=${entry.stats.join(",")}`);
      }
      console.log(entry.stack);
      console.log("---");
    });

    // Check final state
    const finalDisabled = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return btn ? btn.disabled : null;
    });
    console.log("Final button disabled state:", finalDisabled);
  });
});
