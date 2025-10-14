import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../../playwright/helpers/selectors";
import { waitForBattleReady } from "../helpers/battleStateHelper.js";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle replay", () => {
  test("Replay resets scoreboard after match end", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      await waitForBattleReady(page, { allowFallback: false });

      const setQuickMatch = await page.evaluate(() => {
        const engineApi = window.__TEST_API?.engine;
        if (!engineApi) {
          return { applied: false, error: "ENGINE_API_UNAVAILABLE" };
        }

        const success = engineApi.setPointsToWin(1);
        const current = engineApi.getPointsToWin();

        return { applied: success && current === 1, error: success ? null : "SET_FAILED" };
      });

      if (!setQuickMatch.applied) {
        throw new Error(`Failed to configure quick match: ${setQuickMatch.error}`);
      }

      // Start match
      await page.click("#round-select-2");
      // Capture initial score, click, then assert one-side increment by 1
      const score = page.locator(selectors.scoreDisplay());
      const initialText = (await score.textContent())?.trim();
      await page.locator(selectors.statButton(0)).first().click();
      await expect(score).not.toHaveText(initialText || "");
      const text = (await score.textContent()) || "";
      const pAfter = Number((text.match(/You:\s*(\d+)/) || [])[1] || 0);
      const oAfter = Number((text.match(/Opponent:\s*(\d+)/) || [])[1] || 0);
      const pBefore = Number(((initialText || "").match(/You:\s*(\d+)/) || [])[1] || 0);
      const oBefore = Number(((initialText || "").match(/Opponent:\s*(\d+)/) || [])[1] || 0);
      const deltas = [pAfter - pBefore, oAfter - oBefore];
      expect(deltas.filter((d) => d === 1).length).toBe(1);
      expect(deltas.filter((d) => d !== 0 && d !== 1).length).toBe(0);

      // Click Replay and assert round counter resets
      await page.getByTestId("replay-button").click();
      await expect(page.locator(selectors.roundCounter())).toHaveText("Round 1");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
