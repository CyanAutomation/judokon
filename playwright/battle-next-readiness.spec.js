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

    // Click a stat to move to decision and resolve the round
    const statBtn = page.locator("#stat-buttons button").first();
    await statBtn.click();

    // During roundDecision, Next should still not be ready
    await waitForBattleState(page, "roundDecision", 2000).catch(() => {});
    await expect(page.locator("#next-button[data-next-ready='true']")).toHaveCount(0);

    // Wait for the Next button readiness attribute to appear.
    await page.locator("#next-button[data-next-ready='true']").waitFor({ timeout: 5000 });
  });
});
