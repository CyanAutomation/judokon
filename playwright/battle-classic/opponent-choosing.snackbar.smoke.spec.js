import { test, expect } from "../fixtures/commonSetup.js";

test.describe("Cooldown countdown snackbar", () => {
  test("shows after selecting a stat", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");

    // Click any stat to trigger selection flow
    await page
      .getByRole("button", { name: /power|speed|technique|kumikata|newaza/i })
      .first()
      .click();

    // Expect snackbar to show cooldown countdown text
    const snackbar = page.locator(".snackbar.show");
    await expect(snackbar).toHaveText(/Next round in/i);
  });
});
