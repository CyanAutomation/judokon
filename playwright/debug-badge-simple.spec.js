import { test, expect } from "@playwright/test";

test.describe("Simple badge test", () => {
  test("can manually show badge", async ({ page }) => {
    // Set up feature flag before navigation
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { enableTestMode: true, battleStateBadge: true };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait a bit for any scripts to load
    await page.waitForTimeout(1000);

    // Try to manually make the badge visible
    const badgeVisible = await page.evaluate(() => {
      const badge = document.getElementById("battle-state-badge");
      if (badge) {
        badge.hidden = false;
        badge.removeAttribute("hidden");
        badge.textContent = "Lobby";
        return !badge.hidden;
      }
      return false;
    });

    console.log("Badge manually made visible:", badgeVisible);

    // Check if it worked
    await expect(page.locator("#battle-state-badge")).toBeVisible();
    await expect(page.locator("#battle-state-badge")).toHaveText("Lobby");
  });
});
