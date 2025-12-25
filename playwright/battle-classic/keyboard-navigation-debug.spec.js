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
      await page.keyboard.press("Tab");
      const focusedStatButton = page.locator('[data-testid="stat-button"]:focus');
      await expect(focusedStatButton).toHaveCount(1);

      await page.keyboard.press("Enter");

      await expect(focusedStatButton).toBeDisabled();
      await expect(page.locator('[data-testid="stat-button"]:disabled')).toHaveCount(
        statButtonCount
      );

      const roundMessage = page.locator("header #round-message");
      await expect(roundMessage).toBeVisible();
      await expect(roundMessage).toContainText("You picked:");
      await expect(roundMessage).toContainText("Opponent picked:");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
