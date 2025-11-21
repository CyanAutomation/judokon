import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Cooldown countdown snackbar", () => {
  test("shows after selecting a stat", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");

    // Wait for stat buttons to be ready
    await waitForBattleState(page, "waitingForPlayerAction");

    // Click any stat to trigger selection flow
    await page
      .getByRole("button", { name: /power|speed|technique|kumikata|newaza/i })
      .first()
      .click();

    // Wait for cooldown state after selection
    await waitForBattleState(page, "cooldown");

    // Wait for the snackbar to be updated with the countdown message
    // The snackbar initially shows "First to X points wins" but should be
    // updated to "Next round in" once the cooldown timer starts rendering
    const snackbar = page.locator(".snackbar.show");
    
    // Wait for the text to contain "Next round in"
    await expect(snackbar).toContainText(/Next round in/i, { timeout: 10_000 });
  });
});
