import { test, expect } from "../fixtures/commonSetup.js";
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

      await page.waitForFunction(
        () => {
          const state = document.body?.dataset?.battleState;
          return state === "roundSelect";
        },
        { timeout: 10000 }
      );

      // Next button should be disabled initially
      const next = page.getByTestId("next-button");
      await expect(next).toBeDisabled();

      // Click the first stat button
      const score = page.getByTestId("score-display");
      await expect(score.locator('[data-side="player"]')).toHaveText(/You:\s*0/);
      await expect(score.locator('[data-side="opponent"]')).toHaveText(/Opponent:\s*0/);
      await buttons.first().click();
      await page.waitForFunction(
        () => {
          const firstButton = document.querySelector('[data-testid="stat-button"]');
          return firstButton && firstButton.disabled;
        },
        { timeout: 5000 }
      );

      // Timer should be cleared or show 0s after stat selection
      await expect(page.getByTestId("next-round-timer")).toHaveText(/^(|Time Left: 0s)$/);

      // Scoreboard should upgrade to structured spans sourced from the engine result
      await expect(score.locator('[data-side="player"]')).toHaveText(/You:\s*\d+/);
      await expect(score.locator('[data-side="opponent"]')).toHaveText(/Opponent:\s*\d+/);

      // Cooldown begins and Next becomes ready
      await expect(next).toBeEnabled();
      await expect(next).toHaveAttribute("data-next-ready", "true");

      await page.waitForFunction(
        () => {
          const state = document.body?.dataset?.battleState;
          return [
            "roundResolve",
            "roundWait",
            "roundDisplay",
            "matchDecision",
            "matchOver"
          ].includes(state);
        },
        { timeout: 15000 }
      );
    }, ["log", "info", "warn", "error", "debug"]);
  });

  test("round message shows consolidated stat comparison after selection", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      // Start the match via modal
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Wait for stat buttons to be ready
      const container = page.getByTestId("stat-buttons");
      await expect(container).toHaveAttribute("data-buttons-ready", "true");

      // Click the first stat button (Power)
      const buttons = page.getByTestId("stat-button");
      await buttons.first().click();

      // Wait for round resolution and check that round message shows consolidated stat comparison
      const roundMessage = page.locator("header #round-message");
      await expect(roundMessage).toBeVisible();
      await expect(roundMessage).toContainText("You picked: Power");
      await expect(roundMessage).toContainText("Opponent picked: Power");
      const messageText = await roundMessage.textContent();
      expect(messageText).toMatch(
        /You picked: Power \(\d+\) — Opponent picked: Power \(\d+\) — (You win the round!|Opponent wins the round!|Tie)/
      );
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
