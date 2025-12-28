import { test, expect } from "../fixtures/commonSetup.js";

test.describe("Classic Battle - Immediate Button State After Click", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();
  });

  test("button disables and round feedback updates after selection", async ({ page }) => {
    const container = page.getByTestId("stat-buttons");
    await expect(container).toHaveAttribute("data-buttons-ready", "true");
    const statButtons = page.getByTestId("stat-button");
    await expect(statButtons.first()).toBeEnabled();

    const next = page.getByTestId("next-button");
    await expect(next).toBeDisabled();

    await statButtons.first().click();

    await expect(statButtons.first()).toBeDisabled();

    const roundMessage = page.locator("header #round-message");
    await expect(roundMessage).toBeVisible();
    await expect(roundMessage).toContainText("You picked:");

    await expect(next).toBeEnabled();
    await expect(next).toHaveAttribute("data-next-ready", "true");
  });
});
