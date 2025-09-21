import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleState, waitForNextRoundReadyEvent } from "./fixtures/waits.js";
import { withMutedConsole } from "../tests/utils/console.js";

/**
 * Verify that the Next button can skip the cooldown when no orchestrator is running.
 *
 * @pseudocode
 * 1. Render a minimal page with a disabled Next button.
 * 2. Start the cooldown via `roundManager.startCooldown`.
 * 3. Ensure `nextRoundTimerReady` fires and the button is enabled with `data-next-ready`.
 * 4. Click the button and await the ready promise to resolve quickly.
 */

test("skips cooldown without orchestrator", async ({ page }) => {
  await withMutedConsole(async () => {
    await page.addInitScript(() => {
      // Long cooldown to ensure click truly skips it
      window.__NEXT_ROUND_COOLDOWN_MS = 5000;
      globalThis.__classicBattleEventTarget = new EventTarget();
    });

    // Navigate to actual battle page instead of replacing body HTML
    await page.goto("/src/pages/battleClassic.html");

    // Attempt readiness wait; fall back gracefully when the state machine has not booted yet.
    await waitForBattleState(page, "waitingForMatchStart", 3000).catch(() => {});

    const nextButton = page.locator("#next-button, [data-role='next-round']").first();
    await nextButton.waitFor({ timeout: 3000 });

    const manualCooldown = await page.evaluate(() => {
      const api = window.__TEST_API?.timers;
      if (!api?.startManualCooldownForTest) {
        throw new Error("Manual cooldown test helper unavailable");
      }
      return api.startManualCooldownForTest({ orchestrated: false });
    });

    const { handle, started, hasReady } = manualCooldown;

    expect(started).toBe(true);
    expect(handle).toBeTruthy();
    expect(hasReady).toBe(true);

    await waitForNextRoundReadyEvent(page);

    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveAttribute("data-next-ready", "true");
    await nextButton.click();

    const readySettled = await page.evaluate((cooldownHandle) => {
      return window.__TEST_API.timers.waitForManualCooldownReady(cooldownHandle, 500);
    }, handle);

    expect(readySettled).toBe(true);
  }, ["log", "info", "warn", "error", "debug"]);
});
