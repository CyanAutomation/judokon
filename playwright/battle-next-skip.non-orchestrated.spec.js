import { test, expect } from "./fixtures/commonSetup.js";
import { withMutedConsole } from "../tests/utils/console.js";

/**
 * Verify that the Next button can skip the cooldown when no orchestrator is running.
 *
 * @pseudocode
 * 1. Load the real battle page and choose a match length.
 * 2. Make a stat selection to trigger the post-round cooldown logic.
 * 3. Use the test API to skip the cooldown via `timers.skipCooldown`.
 * 4. Assert the Next button becomes enabled and marked ready, then click it.
 * 5. Confirm the selection state resets for the next round.
 */

test("skips cooldown without orchestrator", async ({ page }) => {
  await withMutedConsole(async () => {
    await page.addInitScript(() => {
      // Long cooldown to ensure click truly skips it
      window.__NEXT_ROUND_COOLDOWN_MS = 5000;
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });

    // Navigate to actual battle page instead of replacing body HTML
    await page.goto("/src/pages/battleClassic.html");

    // Wait for page initialization and choose a match length to start the battle
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Medium" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Wait for Test API availability
    await page.waitForFunction(
      () => {
        return (
          document.querySelector("#next-button") !== null ||
          document.querySelector("[data-role='next-round']") !== null
        );
      },
      { timeout: 5000 }
    );

    // Use existing battle infrastructure instead of synthetic DOM
    const nextButton = page.locator("#next-button, [data-role='next-round']").first();
    await nextButton.waitFor({ timeout: 3000 });

    // Wait for the Classic Battle test API to be available
    await page.waitForFunction(
      () =>
        typeof window.__TEST_API?.inspect?.getDebugInfo === "function" &&
        typeof window.__TEST_API?.timers?.skipCooldown === "function"
    );

    // Make a stat selection so the round resolves and cooldown begins
    await page.getByRole("button", { name: /power/i }).click();
    await page.waitForFunction(() => {
      const info = window.__TEST_API?.inspect?.getDebugInfo?.();
      return info?.store?.selectionMade === true;
    });

    const selectionInfo = await page.evaluate(() => window.__TEST_API.inspect.getDebugInfo());
    expect(selectionInfo.store.selectionMade).toBe(true);

    const skipped = await page.evaluate(() => window.__TEST_API.timers.skipCooldown());
    expect(skipped).toBeTruthy();

    await page.waitForFunction(() => {
      const info = window.__TEST_API?.inspect?.getDebugInfo?.();
      return info?.dom?.nextButtonReady === true;
    });

    // Use the same selector as above for consistency
    const nextBtn = page.locator("#next-button, [data-role='next-round']").first();
    await expect(nextBtn).toBeEnabled();
    await expect(nextBtn).toHaveAttribute("data-next-ready", "true");
    await nextBtn.click();
    const postClickInfo = await page.evaluate(() => window.__TEST_API.inspect.getDebugInfo());
    expect(postClickInfo.store.selectionMade).toBe(false);
  }, ["log", "info", "warn", "error", "debug"]);
});
