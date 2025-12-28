import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Button State Timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();
  });

  test("stat buttons disable after selection", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Click the button
    await statButtons.first().click();

    // Allow the battle flow to reach cooldown instead of relying on arbitrary timeouts
    await waitForBattleState(page, "cooldown");
    await expect(statButtons.first()).toBeDisabled();
  });
});
