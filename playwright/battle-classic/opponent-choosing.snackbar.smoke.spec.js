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

    // Expect snackbar to show cooldown countdown text
    // The cooldown renderer should update the snackbar immediately on first render
    const snackbar = page.locator(".snackbar.show");
    await expect(snackbar).toHaveText(/Next round in/i);
  });
});
