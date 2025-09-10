import { test } from "@playwright/test";
import { waitForBattleState } from "./fixtures/waits.js";

test("state badge visible when flag enabled (fixed)", async ({ page }) => {
  await page.evaluate(() => {
    try {
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
      );
    } catch {}
    // Speed up inter-round where possible
    window.__NEXT_ROUND_COOLDOWN_MS = 0;
  });

  // Use autostart=1 like our working debug test
  await page.goto("/src/pages/battleCLI.html?autostart=1");

  // Wait for battle to start normally
  await waitForBattleState(page, "waitingForPlayerAction", 15000);

  // Now set the battleStateBadge feature flag dynamically
  await page.evaluate(() => {
    try {
      const current = localStorage.getItem("settings");
      const settings = current ? JSON.parse(current) : {};
      settings.featureFlags = settings.featureFlags || {};
      settings.featureFlags.battleStateBadge = { enabled: true };
      localStorage.setItem("settings", JSON.stringify(settings));

      // Trigger the feature flag change event
      if (window.featureFlagsEmitter && typeof window.featureFlagsEmitter.emit === "function") {
        window.featureFlagsEmitter.emit("change");
      }
    } catch (e) {
      console.error("Failed to set battleStateBadge flag:", e);
    }
  });

  // Wait for the badge to appear
  await page.waitForTimeout(500);

  // Check if badge is visible
  const badge = page.locator('[data-testid="battle-state-badge"]');
  await badge.waitFor({ state: "visible", timeout: 5000 });
});
