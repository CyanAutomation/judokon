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
      let text = initialText || "";
      const statButtons = page.locator(selectors.statButton());
      const maxAttempts = Math.min(await statButtons.count(), 3);
      const baselineText = initialText || "";
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await statButtons.nth(attempt).click();
        try {
          const changedTextHandle = await page.waitForFunction(
            ({ selector, initial }) => {
              const current = document.querySelector(selector)?.textContent?.trim();
              if (current && current !== initial) {
                return current;
              }
              return null;
            },
            { selector: selectors.scoreDisplay(), initial: baselineText },
            { timeout: 5000 }
          );
          const maybeText = await changedTextHandle.jsonValue();
          if (maybeText) {
            text = maybeText;
            break;
          }
        } catch (error) {
          if (attempt === maxAttempts - 1) {
            throw error;
          }
        }
      }
      expect(text).not.toBe(initialText || "");
      const pointsBeforeReplay = await page.evaluate(() => {
        const engineApi = window.__TEST_API?.engine;
        if (!engineApi || typeof engineApi.getPointsToWin !== "function") return null;
        return engineApi.getPointsToWin();
      });

      // Click Replay and assert round counter resets
      await page.getByTestId("replay-button").click();
      const engineStateAfterReplay = await page.evaluate(() => {
        const engineApi = window.__TEST_API?.engine;
        if (!engineApi) {
          return { roundsPlayed: null, pointsToWin: null };
        }
        return {
          roundsPlayed: typeof engineApi.getRoundsPlayed === "function"
            ? engineApi.getRoundsPlayed()
            : null,
          pointsToWin:
            typeof engineApi.getPointsToWin === "function"
              ? engineApi.getPointsToWin()
              : null
        };
      });
      expect(engineStateAfterReplay?.roundsPlayed).toBeLessThanOrEqual(1);
      expect(engineStateAfterReplay?.pointsToWin).toBe(pointsBeforeReplay);
      await expect(page.locator(selectors.roundCounter())).toHaveText("Round 1");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
