import { test, expect } from "../fixtures/commonSetup.js";

test.describe("Classic Battle - Stat selection behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal when present
    const mediumButton = page.getByRole("button", { name: "Medium" });
    if ((await mediumButton.count()) > 0) {
      await expect(mediumButton).toBeVisible();
      await mediumButton.click();
    }
  });

  test("disables stat buttons and advances the round after a selection", async ({ page }) => {
    const statContainer = page.getByTestId("stat-buttons");
    const statButtons = page.getByTestId("stat-button");

    await expect(statContainer).toHaveAttribute("data-buttons-ready", "true");
    await expect(statButtons.first()).toBeEnabled();

    await page.waitForFunction(() => {
      const state = document.body?.dataset?.battleState;
      return state === "waitingForPlayerAction";
    });

    await statButtons.first().click();

    await expect(statButtons.first()).toBeDisabled();
    await expect(
      page.locator('[data-testid="stat-button"]:disabled').first()
    ).toBeVisible();

    await page.waitForFunction(() => {
      const state = document.body?.dataset?.battleState;
      return ["roundDecision", "cooldown", "roundOver", "matchDecision", "matchOver"].includes(
        state
      );
    });
  });
});
