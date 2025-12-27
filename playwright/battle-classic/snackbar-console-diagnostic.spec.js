import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../helpers/selectors.js";
import { initializeBattle } from "./support/opponentRevealTestSupport.js";

test.describe("Classic Battle snackbar selection feedback", () => {
  test("shows snackbar after stat selection", async ({ page }) => {
    await initializeBattle(page, { matchSelector: "#round-select-1" });

    const statButtons = page.locator(selectors.statButton());
    await expect(statButtons.first()).toBeVisible();
await statButtons.first().click();
await expect(statButtons.first()).toHaveAttribute('data-selected', 'true');

    const snackbar = page.locator(selectors.snackbarContainer());
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toContainText(/You Picked:/i, { timeout: 2_500 });
  });
});
