import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    // Set up feature flags before navigation
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem(
        "settings",
        JSON.stringify({
          featureFlags: {
            enableTestMode: { enabled: true },
            autoSelect: { enabled: false },
            opponentDelayMessage: { enabled: true }
          }
        })
      );
      window.__FF_OVERRIDES = {
        autoSelect: false,
        opponentDelayMessage: true
      };
    });

    // Navigate directly to the battle page
    await page.goto("/src/pages/battleClassic.html");

    // Wait for stat buttons to be visible and ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    // Click a stat to trigger the opponent choosing state
    await firstStat.click();

    // Snackbar shows the opponent choosing message
    const snackbar = page.locator("#snackbar-container .snackbar");
    await expect(snackbar).toContainText(/Opponent is choosing|choosing|Picked/i, {
      timeout: 5000
    });
  });
});
