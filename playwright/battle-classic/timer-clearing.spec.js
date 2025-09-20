import { test, expect } from "@playwright/test";
import selectors from "../../playwright/helpers/selectors";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle timer clearing", () => {
  test("score is updated immediately when stat selection is made", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      // Start the match
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons to be ready
      const container = page.getByTestId("stat-buttons");
      await expect(container).toHaveAttribute("data-buttons-ready", "true");
      const buttons = page.locator(selectors.statButton(0));
      await expect(buttons.first()).toBeVisible();

      // Verify timer is initially running
      const timerLocator = page.locator(selectors.nextRoundTimer());
      await expect(timerLocator).toHaveText(/Time Left: \d+s/);

      // Click stat button
      await buttons.first().click();

      // Score should be updated
      const score = page.locator(selectors.scoreDisplay());
      await expect(score).toContainText(/You:\s*1/);
      await expect(score).toContainText(/Opponent:\s*0/);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
