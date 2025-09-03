import { test, expect } from "./fixtures/commonSetup.js";
import {
  waitForBattleReady,
  waitForBattleState,
  waitForNextRoundCountdown
} from "./fixtures/waits.js";

test.describe("Next readiness only in cooldown", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Keep a small but non-zero cooldown to observe readiness state
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
      // Disable test mode so the inter-round cooldown does not auto-advance
      // immediately. Persist into settings storage used by the app.
      try {
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { enableTestMode: { enabled: false } } })
        );
      } catch {}
    });
  });

  test("Next not ready during selection/decision; ready in cooldown", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    // Start a round
    await page.locator("#round-select-1").click();
    await waitForBattleReady(page);
    // Ensure we are at selection and Next is not marked ready
    await waitForBattleState(page, "waitingForPlayerAction", 2000);
    await expect(page.locator("#next-button[data-next-ready='true']")).toHaveCount(0);

    // Click a stat to move to decision and resolve the round
    const statBtn = page.locator("#stat-buttons button").first();
    await statBtn.click();

    // During roundDecision, Next should still not be ready
    await waitForBattleState(page, "roundDecision", 2000).catch(() => {});
    await expect(page.locator("#next-button[data-next-ready='true']")).toHaveCount(0);

    // After resolution and entering cooldown, Next becomes ready
    await waitForBattleState(page, "cooldown", 3000);
    // Also ensure the countdown UI appears (snackbar text), as a robust
    // signal not tied solely to state mirroring.
    await waitForNextRoundCountdown(page, 3000);
    // Use direct DOM readiness as the source of truth to avoid environment
    // variance in state mirroring.
    await expect(page.locator("#next-button[data-next-ready='true']")).toHaveCount(1, {
      timeout: 2000
    });
  });
});
