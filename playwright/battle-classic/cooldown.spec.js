import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";
import {
  waitForBattleReady,
  waitForNextButtonReady,
  waitForTestApi
} from "../helpers/battleStateHelper.js";
import { readRoundDiagnostics } from "../helpers/roundDiagnostics.js";
import { applyDeterministicCooldown } from "../helpers/cooldownFixtures.js";

test.describe("Classic Battle cooldown + Next", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      window.__DEBUG_ROUND_TRACKING = true;
    });
  });
  test("Next becomes ready after resolution and advances on click", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.evaluate(() => {
        window.__DEBUG_ROUND_TRACKING = true;
      });
      await applyDeterministicCooldown(page, { cooldownMs: 0 });
      await page.goto("/src/pages/battleClassic.html");

      await waitForTestApi(page);

      const difficultyButton = page.getByRole("button", { name: "Medium" });
      await expect(difficultyButton).toBeVisible();
      await difficultyButton.click();

      await waitForBattleReady(page, { allowFallback: false });

      const roundCounter = page.getByTestId("round-counter");
      await expect(roundCounter).toHaveText(/Round\s*1/);

      const firstStatButton = page.getByTestId("stat-button").first();
      await expect(firstStatButton).toBeVisible();
      await firstStatButton.click();

      await waitForNextButtonReady(page);

      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      // The counter label reflects the upcoming round once the previous round resolves.
      await expect(roundCounter).toHaveText(/Round\s*2/);

      const diagnosticsBeforeNext = await readRoundDiagnostics(page);
      expect(diagnosticsBeforeNext.displayedRound).toBe(2);
      expect(diagnosticsBeforeNext.selectionMade).toBe(true);

      await nextButton.click();

      await expect(roundCounter).toHaveText(/Round\s*2/);
      await expect(roundCounter).not.toHaveText(/Round\s*3/);

      const diagnosticsAfterNext = await readRoundDiagnostics(page);
      expect(diagnosticsAfterNext.displayedRound).toBe(2);
      expect(diagnosticsAfterNext.selectionMade).toBe(false);

      const expectedContexts = ["advance"];
      if (diagnosticsBeforeNext.lastContext) {
        expectedContexts.push(diagnosticsBeforeNext.lastContext);
      }
      expect(expectedContexts).toContain(diagnosticsAfterNext.lastContext);
    }, ["log", "info", "warn", "error", "debug"]);
  });

  test("recovers round counter state after external DOM interference", async ({ page }) => {
    await withMutedConsole(async () => {
      await applyDeterministicCooldown(page, { cooldownMs: 0 });
      await page.goto("/src/pages/battleClassic.html");

      await waitForTestApi(page);

      const roundCounter = page.getByTestId("round-counter");
      const statButtonsContainer = page.getByTestId("stat-buttons");

      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      await waitForBattleReady(page, { allowFallback: false });

      await expect(statButtonsContainer).toHaveAttribute("data-buttons-ready", "true");
      await expect(roundCounter).toHaveText(/Round\s*1/);

      const firstStatButton = page.getByTestId("stat-button").first();
      await expect(firstStatButton).toBeVisible();

      await firstStatButton.click();

      await waitForNextButtonReady(page);

      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      const diagnosticsBeforeInterference = await readRoundDiagnostics(page);
      expect(diagnosticsBeforeInterference.displayedRound).toBe(2);
      expect(diagnosticsBeforeInterference.selectionMade).toBe(true);

      const interference = await page.evaluate(() => {
        return (
          window.__TEST_API?.state?.simulateRoundCounterInterference?.({
            round: 1,
            highestRound: 1
          }) ?? null
        );
      });

      expect(interference).not.toBeNull();
      expect(interference.success).toBe(true);
      expect(interference.previousText).toMatch(/Round\s*2/);
      expect(interference.appliedText).toMatch(/Round\s*1/);
      expect(interference.appliedHighest).toBe("1");

      await expect(roundCounter).toHaveText(/Round\s*1/);

      const diagnosticsAfterInterference = await readRoundDiagnostics(page);
      expect(diagnosticsAfterInterference.displayedRound).toBe(1);
      expect(diagnosticsAfterInterference.highestAttrNumber).toBe(1);
      expect(diagnosticsAfterInterference.highestGlobal).toBeGreaterThanOrEqual(2);
      expect(diagnosticsAfterInterference.selectionMade).toBe(true);

      await nextButton.click();

      await expect(roundCounter).toHaveText(/Round\s*2/);

      const diagnosticsAfterNext = await readRoundDiagnostics(page);
      expect(diagnosticsAfterNext.displayedRound).toBe(2);
      expect(diagnosticsAfterNext.highestGlobal).toBeGreaterThanOrEqual(2);
      expect(diagnosticsAfterNext.highestAttrNumber).toBe(2);
      expect(diagnosticsAfterNext.selectionMade).toBe(false);

      await expect(nextButton).not.toHaveAttribute("data-next-ready", "true");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
