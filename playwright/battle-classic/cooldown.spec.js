import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";
import { waitForBattleReady, waitForTestApi } from "../helpers/battleStateHelper.js";

async function waitForNextButtonReadyViaApi(page, timeout = 5000) {
  const ready = await page.evaluate(
    ({ waitTimeout }) => {
      const stateApi = window.__TEST_API?.state;
      if (!stateApi || typeof stateApi.waitForNextButtonReady !== "function") {
        return null;
      }
      return stateApi.waitForNextButtonReady(waitTimeout);
    },
    { waitTimeout: timeout }
  );

  if (ready === null) {
    throw new Error("Test API waitForNextButtonReady unavailable");
  }

  expect(ready).toBe(true);
}

async function readRoundDiagnostics(page) {
  return await page.evaluate(() => {
    const toNumber = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const counter = document.getElementById("round-counter");
    const text = counter ? String(counter.textContent ?? "") : "";
    const match = text.match(/Round\s*(\d+)/i);
    const datasetValue = counter?.dataset?.highestRound ?? null;
    const debug = window.__TEST_API?.inspect?.getDebugInfo?.();
    const stateApiState = window.__TEST_API?.state?.getBattleState?.() ?? null;

    return {
      text,
      displayedRound: match ? Number(match[1]) : null,
      highestAttr: datasetValue,
      highestAttrNumber: toNumber(datasetValue),
      highestGlobal: toNumber(window.__highestDisplayedRound),
      lastContext:
        typeof window.__lastRoundCounterContext === "string"
          ? window.__lastRoundCounterContext
          : null,
      previousContext:
        typeof window.__previousRoundCounterContext === "string"
          ? window.__previousRoundCounterContext
          : null,
      roundsPlayed: toNumber(debug?.store?.roundsPlayed),
      selectionMade:
        typeof debug?.store?.selectionMade === "boolean" ? debug.store.selectionMade : null,
      machineState: debug?.machine?.currentState ?? null,
      snapshotState: debug?.snapshot?.state ?? null,
      apiState: typeof stateApiState === "string" ? stateApiState : null,
      error: debug?.error ?? null
    };
  });
}

test.describe("Classic Battle cooldown + Next", () => {
  test("Next becomes ready after resolution and advances on click", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
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

      await waitForNextButtonReadyViaApi(page);

      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      await expect(roundCounter).toHaveText(/Round\s*2/);

      const diagnosticsBeforeNext = await readRoundDiagnostics(page);
      expect(diagnosticsBeforeNext.displayedRound).toBe(2);

      await nextButton.click();

      await expect(roundCounter).toHaveText(/Round\s*2/);
      await expect(roundCounter).not.toHaveText(/Round\s*3/);

      const diagnosticsAfterNext = await readRoundDiagnostics(page);
      expect(diagnosticsAfterNext.displayedRound).toBe(2);
      const allowedContexts = new Set(
        [diagnosticsBeforeNext.lastContext, "advance"].filter(Boolean)
      );
      expect(allowedContexts.has(diagnosticsAfterNext.lastContext)).toBe(true);
    }, ["log", "info", "warn", "error", "debug"]);
  });

  test("recovers round counter state after external DOM interference", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
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

      await waitForNextButtonReadyViaApi(page);

      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      const diagnosticsBeforeNext = await readRoundDiagnostics(page);
      expect(diagnosticsBeforeNext.displayedRound).toBe(2);

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

      await nextButton.click();

      await expect(roundCounter).toHaveText(/Round\s*2/);

      const diagnosticsAfterNext = await readRoundDiagnostics(page);
      expect(diagnosticsAfterNext.displayedRound).toBe(2);
      expect(diagnosticsAfterNext.highestGlobal).toBeGreaterThanOrEqual(
        diagnosticsBeforeNext.displayedRound ?? 2
      );
      expect(
        diagnosticsAfterNext.lastContext === "advance" ||
          diagnosticsAfterNext.lastContext === diagnosticsBeforeNext.lastContext
      ).toBe(true);

      await expect(nextButton).not.toHaveAttribute("data-next-ready", "true");
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
