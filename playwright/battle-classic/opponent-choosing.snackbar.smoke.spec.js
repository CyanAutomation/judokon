import { test, expect } from "@playwright/test";

test.describe("Opponent choosing snackbar", () => {
  test("shows after selecting a stat", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");

    // Click any stat to trigger selection flow
    await page.getByRole("button", { name: /power|speed|technique|kumikata|newaza/i }).first().click();

    // Expect snackbar to contain opponent choosing text
    const snackbar = page.locator(".snackbar.show");
    await expect(snackbar).toHaveText(/Opponent is choosing/i);
  });
});
