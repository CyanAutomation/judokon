import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle stat selection", () => {
  test("buttons enabled after start; clicking resolves and starts cooldown", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      // Start the match via modal
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Stat buttons should render and be enabled
      const container = page.getByTestId("stat-buttons");
      await expect(container).toHaveAttribute("data-buttons-ready", "true");
      const buttons = page.getByTestId("stat-button");
      await expect(buttons.first()).toBeVisible();
      await expect(buttons.first()).toBeEnabled();

      // Next button should be disabled initially
      const next = page.getByTestId("next-button");
      await expect(next).toBeDisabled();

      // Click the first stat button
      const score = page.getByTestId("score-display");
      await expect(score.locator('[data-side="player"]')).toHaveText(/You:\s*0/);
      await expect(score.locator('[data-side="opponent"]')).toHaveText(/Opponent:\s*0/);
      await buttons.first().click();

      // Timer should be cleared or show 0s after stat selection
      await expect(page.getByTestId("next-round-timer")).toHaveText(/^(|Time Left: 0s)$/);

      // Scoreboard should upgrade to structured spans sourced from the engine result
      await expect(score.locator('[data-side="player"]')).toHaveText(/You:\s*\d+/);
      await expect(score.locator('[data-side="opponent"]')).toHaveText(/Opponent:\s*\d+/);

      // Cooldown begins and Next becomes ready
      await expect(next).toBeEnabled();
      await expect(next).toHaveAttribute("data-next-ready", "true");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
