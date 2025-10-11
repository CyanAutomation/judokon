import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Battle state progress list", () => {
  test("renders and updates when the feature flag is enabled", async ({ page }) =>
    withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = {
          battleStateProgress: true,
          showRoundSelectModal: true
        };
      });

      await page.goto("/src/pages/battleClassic.html");

      // Start the round via the modal so the battle flow kicks in.
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons to be ready so the match has fully initialised.
      const statContainer = page.getByTestId("stat-buttons");
      await expect(statContainer).toHaveAttribute("data-buttons-ready", "true");

      // Wait until the progress list renders and is visible.
      await page.waitForFunction(() => {
        const list = document.getElementById("battle-state-progress");
        if (!list || list.children.length === 0) return false;
        return getComputedStyle(list).display !== "none";
      });

      const progress = page.getByTestId("battle-state-progress");
      await expect(progress).toBeVisible();

      const items = progress.locator("li");
      const totalStates = await items.count();
      expect(totalStates).toBeGreaterThan(5);

      const activeBefore = await items.filter({ hasClass: "active" }).first().getAttribute("data-state");
      expect(activeBefore).not.toBeNull();

      // Trigger a state transition by selecting the first stat button.
      const statButtons = page.getByTestId("stat-button");
      await statButtons.first().click();

      await expect.poll(async () => {
        return items.filter({ hasClass: "active" }).first().getAttribute("data-state");
      }).not.toEqual(activeBefore);

      await expect(items.filter({ hasClass: "active" }).first()).toHaveAttribute("aria-current", "step");
    }, ["log", "info", "warn", "error", "debug"]));
});
