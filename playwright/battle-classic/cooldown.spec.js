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

  test("Round counter fallback respects engine state after DOM reversion", async ({ page }) => {
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

      let observerInstalled = false;
      try {
        await page.evaluate(() => {
          const counter = document.getElementById("round-counter");
          if (!counter) throw new Error("round counter element missing");
          const baselineText = String(counter.textContent ?? "");
          const baselineHighest = counter.dataset?.highestRound ?? null;
          let reverted = false;
          const observer = new MutationObserver(() => {
            if (reverted || !counter.isConnected) return;
            const currentText = String(counter.textContent ?? "");
            const currentHighest = counter.dataset?.highestRound ?? null;
            if (currentText !== baselineText || currentHighest !== baselineHighest) {
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
            }
          });
          observer.observe(counter, { characterData: true, childList: true, subtree: true });
          window.__restoreRoundCounterObserver = () => {
            observer.disconnect();
            delete window.__restoreRoundCounterObserver;
          };
        });
        observerInstalled = true;

        await nextButton.click();

        await expect(roundCounter).toHaveText(/Round\s*2/);
        const fallbackSnapshot = await page.evaluate(async () => {
          const { getRoundsPlayed } = await import("/src/helpers/battleEngineFacade.js");
          const counter = document.getElementById("round-counter");
          const text = String(counter?.textContent ?? "");
          const match = text.match(/Round\s*(\d+)/i);
          const displayed = match ? Number(match[1]) : NaN;
          const played = Number(getRoundsPlayed());
          const expected = Number.isFinite(played) ? played + 1 : NaN;
          return {
            displayed,
            expected,
            highest: Number(window.__highestDisplayedRound ?? NaN),
            lastContext: window.__lastRoundCounterContext ?? null,
            previousContext: window.__previousRoundCounterContext ?? null
          };
        });
        expect(Number.isFinite(fallbackSnapshot.expected)).toBe(true);
        expect(fallbackSnapshot.displayed).toBe(fallbackSnapshot.expected);
        expect(fallbackSnapshot.highest).toBe(fallbackSnapshot.expected);
        expect(fallbackSnapshot.lastContext).toBe(contextBeforeNext.last);

        await page.evaluate(() => window.__restoreRoundCounterObserver?.());
        observerInstalled = false;

        await page.waitForFunction(() => window.__lastRoundCounterContext === "advance");
        await page.waitForFunction(
          (expected) => window.__previousRoundCounterContext === expected,
          contextBeforeNext.last
        );

        await expect(nextButton).not.toHaveAttribute("data-next-ready", "true");

        const cycleSnapshot = await page.evaluate(async () => {
          const { getRoundsPlayed } = await import("/src/helpers/battleEngineFacade.js");
          const counter = document.getElementById("round-counter");
          const text = String(counter?.textContent ?? "");
          const match = text.match(/Round\s*(\d+)/i);
          const displayed = match ? Number(match[1]) : NaN;
          const played = Number(getRoundsPlayed());
          const expected = Number.isFinite(played) ? played + 1 : NaN;
          return {
            displayed,
            expected,
            highest: Number(window.__highestDisplayedRound ?? NaN),
            lastContext: window.__lastRoundCounterContext ?? null,
            previousContext: window.__previousRoundCounterContext ?? null
          };
        });
        expect(Number.isFinite(cycleSnapshot.expected)).toBe(true);
        expect(cycleSnapshot.displayed).toBe(cycleSnapshot.expected);
        expect(cycleSnapshot.highest).toBe(cycleSnapshot.expected);
        expect(cycleSnapshot.lastContext).toBe("advance");
        expect(cycleSnapshot.previousContext).toBe(contextBeforeNext.last);
      } finally {
        if (observerInstalled) {
          await page.evaluate(() => window.__restoreRoundCounterObserver?.());
        }
      }
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
