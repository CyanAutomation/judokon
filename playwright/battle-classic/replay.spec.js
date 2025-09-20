import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../../playwright/helpers/selectors";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle replay", () => {
  test("Replay resets scoreboard after match end", async ({ page }) => {
    await withMutedConsole(async () => {
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
      await page.locator(selectors.statButton(0)).first().click();
      await expect(page.locator(selectors.scoreDisplay())).toContainText(/You:\s*1/);

      // Click Replay and assert round counter resets
      await page.getByTestId("replay-button").click();
      await expect(page.locator(selectors.roundCounter())).toHaveText("Round 1");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
