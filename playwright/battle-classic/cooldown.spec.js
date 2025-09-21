import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle cooldown + Next", () => {
  test("Next becomes ready after resolution and advances on click", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      const roundCounter = page.getByTestId("round-counter");

      // Start the match via modal (pick medium/10)
      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      // Before the first round, the counter is 1
      await expect(roundCounter).toHaveText("Round 1");

      // Click a stat to complete the round
      await expect(page.getByTestId("stat-button").first()).toBeVisible();
      await page.getByTestId("stat-button").first().click();

      // Cooldown begins and Next becomes ready
      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      // Simulate an engine-driven advance using the scoreboard API and diagnostic state.
      await page.evaluate(async () => {
        const { updateRoundCounter } = await import("/src/helpers/setupScoreboard.js");
        updateRoundCounter(2);

        const lastTrackedContext =
          typeof window.__lastRoundCounterContext === "string"
            ? window.__lastRoundCounterContext
            : null;
        const previousTrackedContext =
          typeof window.__previousRoundCounterContext === "string"
            ? window.__previousRoundCounterContext
            : null;
        window.__highestDisplayedRound = 2;
        window.__previousRoundCounterContext =
          previousTrackedContext ?? lastTrackedContext ?? "advance";
        window.__lastRoundCounterContext = "advance";
      });
      await expect(roundCounter).toHaveText("Round 2");

      // Click next button
      await nextButton.click();

      // Immediately after the click, the round counter should remain on Round 2
      // ensuring no eager fallback increments to Round 3.
      await expect(roundCounter).toHaveText(/Round\s*2/);
      await expect(roundCounter).not.toHaveText(/Round\s*3/);
    }, ["log", "info", "warn", "error", "debug"]);
  });

  // Regression: verifies the round counter fallback realigns engine state after
  // external scripts or extensions revert DOM changes.
  test("recovers round counter state after external DOM interference", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      const roundCounter = page.getByTestId("round-counter");
      const statButtonsContainer = page.getByTestId("stat-buttons");

      await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
      await page.getByRole("button", { name: "Medium" }).click();

      await expect(statButtonsContainer).toHaveAttribute("data-buttons-ready", "true");
      await expect(roundCounter).toHaveText(/Round\s*1/);

      const firstStatButton = page.getByTestId("stat-button").first();
      await expect(firstStatButton).toBeVisible();

      await firstStatButton.click();

      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      const contextBeforeNext = await page.evaluate(() => ({
        last: window.__lastRoundCounterContext ?? null,
        previous: window.__previousRoundCounterContext ?? null
      }));

      try {
        await page.evaluate(() => {
          const counter = document.getElementById("round-counter");
          if (!counter) throw new Error("round counter element missing");
          const baselineText = String(counter.textContent ?? "");
          const baselineHighest = counter.dataset?.highestRound ?? null;
          let reverted = false;
          let revertInProgress = false;
          const observer = new MutationObserver(() => {
            if (reverted || !counter.isConnected || revertInProgress) return;
            const currentText = String(counter.textContent ?? "");
            const currentHighest = counter.dataset?.highestRound ?? null;
            if (currentText !== baselineText || currentHighest !== baselineHighest) {
              revertInProgress = true;
              reverted = true;
              counter.textContent = baselineText;
              if (counter.dataset) {
                if (baselineHighest !== null) {
                  counter.dataset.highestRound = baselineHighest;
                } else {
                  delete counter.dataset.highestRound;
                }
              }
              observer.disconnect();
              revertInProgress = false;
            }
          });
          observer.observe(counter, { characterData: true, childList: true, subtree: true });
          window.__restoreRoundCounterObserver = () => {
            observer.disconnect();
            delete window.__restoreRoundCounterObserver;
          };
        });
        await nextButton.click();

        await expect(roundCounter).toHaveText(/Round\s*2/);
        const captureRoundSnapshot = async () => {
          try {
            const { getRoundsPlayed } = await import("/src/helpers/battleEngineFacade.js");
            const counter = document.getElementById("round-counter");
            const text = String(counter?.textContent ?? "");
            const match = text.match(/Round\s*(\d+)/i);
            const displayed = match ? Number(match[1]) : NaN;
            const played = Number(getRoundsPlayed());
            const expected = Number.isFinite(played) ? played + 1 : NaN;
            return {
              error: null,
              displayed,
              expected,
              highest: Number(window.__highestDisplayedRound ?? NaN),
              lastContext: window.__lastRoundCounterContext ?? null,
              previousContext: window.__previousRoundCounterContext ?? null
            };
          } catch (error) {
            return {
              error: error instanceof Error ? error.message : String(error),
              displayed: NaN,
              expected: NaN,
              highest: NaN,
              lastContext: null,
              previousContext: null
            };
          }
        };
        const fallbackSnapshot = await page.evaluate(captureRoundSnapshot);
        expect(
          fallbackSnapshot.error,
          `Snapshot should resolve without error, received: ${fallbackSnapshot.error ?? "<none>"}`
        ).toBeNull();
        expect(
          Number.isFinite(fallbackSnapshot.expected),
          `Expected rounds played + 1 to be finite, got: ${fallbackSnapshot.expected}`
        ).toBe(true);
        expect(
          fallbackSnapshot.displayed,
          `Round counter should display ${fallbackSnapshot.expected}, but shows ${fallbackSnapshot.displayed}`
        ).toBe(fallbackSnapshot.expected);
        expect(
          fallbackSnapshot.highest,
          `Highest displayed round should be ${fallbackSnapshot.expected}, but is ${fallbackSnapshot.highest}`
        ).toBe(fallbackSnapshot.expected);
        expect(
          fallbackSnapshot.lastContext,
          `Last context should remain ${contextBeforeNext.last}, but was ${fallbackSnapshot.lastContext}`
        ).toBe(contextBeforeNext.last);

        await page.evaluate(() => window.__restoreRoundCounterObserver?.());
        await page.waitForFunction(() => window.__lastRoundCounterContext === "advance");
        await page.waitForFunction(
          (expected) => window.__previousRoundCounterContext === expected,
          contextBeforeNext.last
        );

        await expect(nextButton).not.toHaveAttribute("data-next-ready", "true");

        const cycleSnapshot = await page.evaluate(captureRoundSnapshot);
        expect(
          cycleSnapshot.error,
          `Snapshot should resolve without error, received: ${cycleSnapshot.error ?? "<none>"}`
        ).toBeNull();
        expect(
          Number.isFinite(cycleSnapshot.expected),
          `Expected rounds played + 1 to be finite, got: ${cycleSnapshot.expected}`
        ).toBe(true);
        expect(
          cycleSnapshot.displayed,
          `Round counter should display ${cycleSnapshot.expected}, but shows ${cycleSnapshot.displayed}`
        ).toBe(cycleSnapshot.expected);
        expect(
          cycleSnapshot.highest,
          `Highest displayed round should be ${cycleSnapshot.expected}, but is ${cycleSnapshot.highest}`
        ).toBe(cycleSnapshot.expected);
        expect(cycleSnapshot.lastContext, "Last context should update to 'advance'").toBe(
          "advance"
        );
        expect(
          cycleSnapshot.previousContext,
          `Previous context should match ${contextBeforeNext.last}, but was ${cycleSnapshot.previousContext}`
        ).toBe(contextBeforeNext.last);
      } finally {
        try {
          await page.evaluate(() => {
            if (typeof window.__restoreRoundCounterObserver === "function") {
              window.__restoreRoundCounterObserver();
            }
            delete window.__restoreRoundCounterObserver;
          });
        } catch (cleanupError) {
          console.warn(
            "Test cleanup failed:",
            cleanupError instanceof Error ? cleanupError.message : cleanupError
          );
        }
      }
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
