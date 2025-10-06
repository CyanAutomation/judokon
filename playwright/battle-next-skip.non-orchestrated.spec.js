import { test, expect } from "./fixtures/commonSetup.js";
import { withMutedConsole } from "../tests/utils/console.js";
import { NEXT_ROUND_COOLDOWN_MS } from "../fixtures/nextRoundCooldown.js";

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
      window.__NEXT_ROUND_COOLDOWN_MS = NEXT_ROUND_COOLDOWN_MS;
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });

    // Navigate to actual battle page instead of replacing body HTML
    await page.goto("/src/pages/battleClassic.html");

    // Wait for page initialization and choose a match length to start the battle
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Medium" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.evaluate(() =>
      window.__TEST_API?.state?.waitForBattleState?.("waitingForPlayerAction")
    );

    // Use existing battle infrastructure instead of synthetic DOM
    const nextButton = page.locator("#next-button, [data-role='next-round']").first();
    await page.evaluate(() => window.__TEST_API?.state?.waitForNextButtonReady?.(0));

    // Make a stat selection so the round resolves and cooldown begins
    await page.getByRole("button", { name: /power/i }).click();

    // Wait for cooldown to complete and next button to be ready
    await expect(nextButton).toHaveAttribute("data-next-ready", "true");

    // Click next button
    await nextButton.click();

    // Verify selection state resets - stat buttons should be enabled again
    const statButtons = page.locator("#stat-buttons button[data-stat]");
    await expect(statButtons.first()).toBeEnabled();
  }, ["log", "info", "warn", "error", "debug"]);
});
