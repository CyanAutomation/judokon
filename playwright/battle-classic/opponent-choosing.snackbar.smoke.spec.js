import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Cooldown countdown display", () => {
  test("shows countdown timer after selecting a stat", async ({ page }) => {
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

    // Verify the next-round-timer element shows the countdown
    // The cooldown renderer updates both the snackbar and the timer display
    // Note: The snackbar may show other messages like "Opponent is choosing..." or
    // "First to 5 points wins." during transitions, but the timer element reliably
    // shows the countdown value.
    const timer = page.getByTestId("next-round-timer");
    await expect(timer).toBeVisible();
    await expect(timer).toContainText(/\d+s/, { timeout: 5_000 });
  });
});
