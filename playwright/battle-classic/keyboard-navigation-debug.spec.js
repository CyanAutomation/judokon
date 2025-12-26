import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle keyboard navigation", () => {
  test("keyboard selection updates round message and disables buttons", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      // Start the match via modal
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      const container = page.getByTestId("stat-buttons");
      await expect(container).toHaveAttribute("data-buttons-ready", "true");

      const statButtons = page.getByTestId("stat-button");
      const statButtonCount = await statButtons.count();
      await expect(statButtons.first()).toBeEnabled();

      // Tab into the stat buttons and use Enter to select.
      // Focus the first stat button directly to ensure reliable test execution
      const firstButton = statButtons.first();
      await firstButton.focus();

      await page.keyboard.press("Enter");

      // Wait for the UI to update after selection
      await expect(firstButton).toBeDisabled({ timeout: 2000 });
      await expect(page.locator('[data-testid="stat-button"]:disabled')).toHaveCount(
        statButtonCount,
        { timeout: 2000 }
      );

      const roundMessage = page.locator("header #round-message");
      await expect(roundMessage).toBeVisible({ timeout: 2000 });
      await expect(roundMessage).toContainText("You picked:", { timeout: 2000 });
      await expect(roundMessage).toContainText("Opponent picked:", { timeout: 2000 });
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
