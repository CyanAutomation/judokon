import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./fixtures/waits.js";

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
    // Initial flow includes a match-start cooldown before selection.
    await waitForBattleState(page, "cooldown", 6000);
    await waitForBattleState(page, "waitingForPlayerAction", 6000);
    await expect(page.locator("#next-button[data-next-ready='true']")).toHaveCount(0);

    // Click a stat to move to decision and resolve the round
    const statBtn = page.locator("#stat-buttons button").first();
    await statBtn.click();

    // During roundDecision, Next should still not be ready
    await waitForBattleState(page, "roundDecision", 2000).catch(() => {});
    await expect(page.locator("#next-button[data-next-ready='true']")).toHaveCount(0);

    // The orchestrator now emits `nextRoundTimerReady` when the cooldown is finished.
    // We can wait for this event as the primary signal.
    await page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener("nextRoundTimerReady", resolve, { once: true });
      });
    });

    // As a fallback and final assertion, check for the data attribute.
    await expect(page.locator("#next-button[data-next-ready='true']")).toHaveCount(1, {
      timeout: 2000
    });
  });
});
