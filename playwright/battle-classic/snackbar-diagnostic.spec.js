import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import {
  waitForNextButtonReady,
  waitForStatButtonsReady
} from "../helpers/battleStateHelper.js";

test.describe("Snackbar diagnostic tests", () => {
  test("selecting a stat shows snackbar and enables Next", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });

      await page.goto("/src/pages/battleClassic.html");

      const difficultyButton = page.getByRole("button", { name: "Medium" });
      await expect(difficultyButton).toBeVisible();
      await difficultyButton.click();

      await waitForStatButtonsReady(page);

      // Click stat button
      const statButton = page.getByTestId("stat-button").first();
      await statButton.click();

      const snackbarLocator = page.locator("#snackbar-container, .snackbar");
      await expect(snackbarLocator).toContainText(/Opponent is choosing|Next round in/);

      await waitForNextButtonReady(page);
      await expect(page.getByTestId("next-button")).toBeEnabled();
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
