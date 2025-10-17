import { test, expect } from "@playwright/test";
import { waitForBattleState } from "../fixtures/waits.js";

test.describe("Classic Battle keyboard navigation", () => {
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

  test("should allow tab navigation to stat buttons and keyboard activation", async ({ page }) => {
    // Wait for stat buttons to be enabled via battle state readiness
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    const statButtonCount = await statButtons.count();
    const firstStatButton = statButtons.first();
    const focusedStatButton = page.locator('[data-testid="stat-button"]:focus');
    await expect(firstStatButton).toBeEnabled();

    // Ensure the first stat button naturally receives focus when ready
    await expect(focusedStatButton).toHaveCount(1);
    await expect(focusedStatButton).toBeFocused();
    await expect(firstStatButton).toBeFocused();

    // Tab to the second stat button
    await page.keyboard.press("Tab");
    await expect(statButtons.nth(1)).toBeFocused();

    // Tab to the third stat button
    await page.keyboard.press("Tab");
    await expect(statButtons.nth(2)).toBeFocused();

    const thirdStatButton = statButtons.nth(2);

    // Press Enter to select the third stat button
    await page.keyboard.press("Enter");

    // Verify that selection occurred (timer should start, buttons should be disabled)
    await expect(page.getByTestId("next-round-timer")).toHaveText(/^(|Time Left: \d+s)$/);
    // Check that all buttons receive the disabled class once the round resolves
    const disabledStatButtons = page.locator('[data-testid="stat-button"].disabled');
    await expect.poll(async () => disabledStatButtons.count()).toBe(statButtonCount);
    await expect
      .poll(async () => thirdStatButton.getAttribute("class"))
      .toMatch(/disabled/);
  });

  test("should show visible focus styles on stat buttons", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    const focusedStatButton = page.locator('[data-testid="stat-button"]:focus');
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Verify the naturally focused button displays the expected outline
    await expect(statButtons.first()).toBeFocused();
    await expect(focusedStatButton).toHaveCount(1);

    // Check that focus styles are applied (outline should be visible)
    await expect(focusedStatButton).toHaveCSS("outline-style", "solid");
    await expect(focusedStatButton).toHaveCSS("outline-width", "2px");
  });

  test("should have proper ARIA labels on stat buttons", async ({ page }) => {
    // Check ARIA labels on stat buttons
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    const ariaLabelPatterns = ["Power", "Speed", "Technique"].map(
      (stat) => new RegExp(`^(Select ${stat} stat for battle|${stat})$`, "i")
    );
    await expect(statButtons.first()).toHaveAttribute("aria-label", ariaLabelPatterns[0]);
    await expect(statButtons.nth(1)).toHaveAttribute("aria-label", ariaLabelPatterns[1]);
    await expect(statButtons.nth(2)).toHaveAttribute("aria-label", ariaLabelPatterns[2]);
  });
});
