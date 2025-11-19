import { test as base, expect } from "@playwright/test";

// Don't use commonSetup fixture because it clobbers localStorage
const test = base;

test.describe("Classic Battle – opponent choosing snackbar", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    // Set up localStorage BEFORE navigating to the page
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
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for stat buttons to be visible and ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    // Click a stat to trigger the opponent choosing state
    await firstStat.click();

    // Snackbar should show the opponent choosing message
    const snackbar = page.locator("#snackbar-container .snackbar");
    await expect(snackbar).toContainText(/Opponent is choosing|choosing/i, {
      timeout: 5000
    });
  });
});
