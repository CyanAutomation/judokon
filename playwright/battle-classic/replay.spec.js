import { test, expect } from "../fixtures/commonSetup.js";

test.describe("Classic Battle replay", () => {
  test("Replay resets scoreboard after match end", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Wait for battle engine initialization
    await page.waitForFunction(() => !!window.battleStore);

    // Set points to win to 1 for quick match
    await page.evaluate(async () => {
      const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
      setPointsToWin(1);
    });

    // Start match
    await page.click("#round-select-2");
    await page.getByTestId("stat-button").first().click();
    await expect(page.getByTestId("score-display")).toContainText(/You:\s*1/);

    // Click Replay and assert round counter resets
    await page.getByTestId("replay-button").click();
    await expect(page.getByTestId("round-counter")).toHaveText("Round 1");
  });
});
