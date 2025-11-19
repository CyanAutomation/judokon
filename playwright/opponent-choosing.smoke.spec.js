import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    // The commonSetup fixture clears localStorage and sets enableTestMode
    // We need to update localStorage AFTER that, in an init script that runs LATER
    // or we need to set it after page load

    await page.goto("/src/pages/battleClassic.html");

    // Update settings after page load to enable opponentDelayMessage and disable autoSelect
    await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem("settings") || "{}");
      if (!settings.featureFlags) settings.featureFlags = {};
      settings.featureFlags.autoSelect = { enabled: false };
      settings.featureFlags.opponentDelayMessage = { enabled: true };
      localStorage.setItem("settings", JSON.stringify(settings));

      // Also set overrides for immediate effect
      window.__FF_OVERRIDES = {
        autoSelect: false,
        opponentDelayMessage: true
      };
    });

    // Reload to apply settings
    await page.reload();

    // Wait for stat buttons to be visible and ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    // Verify flags are actually enabled
    const flagsCheck = await page.evaluate(() => {
      const isEnabled = window.isEnabled || (() => false);
      return {
        opponentDelayMessage: isEnabled("opponentDelayMessage"),
        autoSelect: isEnabled("autoSelect")
      };
    });

    expect(flagsCheck.opponentDelayMessage).toBe(true);
    expect(flagsCheck.autoSelect).toBe(false);

    // Click a stat to trigger the opponent choosing state
    await firstStat.click();

    // Snackbar should show the opponent choosing message
    const snackbar = page.locator("#snackbar-container .snackbar");
    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i, {
      timeout: 5000
    });
  });
});
