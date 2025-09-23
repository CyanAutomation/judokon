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

      // Capture initial score text for deterministic comparison
      const score = page.locator(selectors.scoreDisplay());
      const initialText = (await score.textContent())?.trim();

      // Click stat button
      await buttons.first().click();

      // Score should update immediately (one side increments by 1)
      await expect(score).not.toHaveText(initialText || "");

      const text = (await score.textContent()) || "";
      const playerMatch = text.match(/You:\s*(\d+)/);
      const opponentMatch = text.match(/Opponent:\s*(\d+)/);
      const [pAfter, oAfter] = [Number(playerMatch?.[1] || 0), Number(opponentMatch?.[1] || 0)];

      const pBeforeMatch = (initialText || "").match(/You:\s*(\d+)/);
      const oBeforeMatch = (initialText || "").match(/Opponent:\s*(\d+)/);
      const [pBefore, oBefore] = [Number(pBeforeMatch?.[1] || 0), Number(oBeforeMatch?.[1] || 0)];

      // Exactly one side should increment by 1
      const playerDelta = pAfter - pBefore;
      const opponentDelta = oAfter - oBefore;
      expect([playerDelta, opponentDelta].filter((d) => d === 1).length).toBe(1);
      expect([playerDelta, opponentDelta].filter((d) => d !== 0 && d !== 1).length).toBe(0);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
