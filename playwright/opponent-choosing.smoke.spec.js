import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");
    
    // Set overrides AFTER page load to avoid being clobbered by commonSetup fixture
    await page.evaluate(() => {
      window.__FF_OVERRIDES = {
        autoSelect: false,
        opponentDelayMessage: true
      };
    });

    // Wait for stat buttons to be visible and ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    // Verify flags are actually enabled after setting overrides
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
