import { test, expect } from "@playwright/test";
import selectors from "../helpers/selectors.js";
import { readScoreboardRound } from "../helpers/roundCounter.js";

test.describe("Classic Battle Opponent Reveal", () => {
  test.describe("Basic Opponent Reveal Functionality", () => {
    test("shows opponent choosing message after stat selection", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__NEXT_ROUND_COOLDOWN_MS = 1000;
        window.__OPPONENT_RESOLVE_DELAY_MS = 120;
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
        // Set VITEST environment for opponent choosing message
        window.process = { env: { VITEST: "1" } };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      // Start the match via modal
      await page.waitForSelector("#round-select-2", { state: "visible" });
      await page.click("#round-select-2");

      // Set a short opponent delay for the snackbar message
      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(50);
      });

      // Click the first stat (player 0)
      const firstStat = page.locator(selectors.statButton(0)).first();
      await firstStat.click();

      // Expect the snackbar to show opponent choosing soon
      const snack = page.locator(selectors.snackbarContainer());
      await expect(snack).toContainText(/Opponent is choosing/i, { timeout: 1000 });

      // After resolution delay, outcome should apply and cooldown begin
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);
      const next = page.locator("#next-button");
      await expect(next).toBeEnabled();
      await expect(next).toHaveAttribute("data-next-ready", "true");
    });

    test("opponent reveal works with different delay settings", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      // Start match
      await page.waitForSelector("#round-select-2", { state: "visible" });
      await page.click("#round-select-2");

      // Test with no delay
      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(0);
      });

      const firstStat = page.locator(selectors.statButton(0)).first();
      await firstStat.click();

      // Should still show opponent choosing briefly
      const snackbar = page.locator(selectors.snackbarContainer());
      await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 500 });

      // Score should update quickly
      await expect(page.locator(selectors.scoreDisplay())).toContainText(/You:\s*\d/);
    });

    test("opponent reveal integrates with battle flow", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 10 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      // Start 3-round match
      await page.waitForSelector("#round-select-3", { state: "visible" });
      await page.click("#round-select-3");

      // Set moderate delay
      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(100);
      });

      // Force the engine to report the previous total for the next few reads so the
      // round counter update must rely on the visible value when advancing.
      await page.evaluate(async () => {
        const facade = await import("/src/helpers/battleEngineFacade.js");
        if (typeof facade.requireEngine !== "function") {
          window.__restoreRoundsPlayed = null;
          return;
        }
        try {
          const engine = facade.requireEngine();
          const originalGetRoundsPlayed = engine.getRoundsPlayed.bind(engine);
          let calls = 0;
          engine.getRoundsPlayed = () => {
            calls += 1;
            const reported = Number(originalGetRoundsPlayed());
            if (calls <= 4 && Number.isFinite(reported)) {
              return Math.max(0, reported - 1);
            }
            return reported;
          };
          window.__restoreRoundsPlayed = () => {
            engine.getRoundsPlayed = originalGetRoundsPlayed;
          };
        } catch {
          window.__restoreRoundsPlayed = null;
        }
      });

      // First round
      const firstStat = page.locator(selectors.statButton(0)).first();
      await firstStat.click();

      // Verify battle flow continues (snackbar shows various states)

      const snackbar = page.locator(selectors.snackbarContainer());
      await expect(snackbar).toBeVisible();

      // Wait for resolution and next round button
      const nextButton = page.locator("#next-button");
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      const roundCounter = page.locator("#round-counter");
      const readRoundNumber = () => readScoreboardRound(roundCounter);

      const initialRound = await readRoundNumber();
      const initialRoundNumber = initialRound ?? 0;

      const beforeNext = await readRoundNumber();
      expect(
        beforeNext,
        "Round counter should show a valid number before advancing."
      ).not.toBeNull();
      const beforeNextNumber = /** @type {number} */ (beforeNext);

      const expectedMinimum = Math.max(beforeNextNumber, initialRoundNumber + 1);

      // Track scoreboard mutations to ensure the counter never regresses once the
      // Next button is clicked, even if the engine reports a stale round count.
      await page.evaluate((threshold) => {
        const counter = document.getElementById("round-counter");
        if (!counter) return;
        const tracker = {
          threshold,
          regressed: false,
          values: []
        };
        const observer = new MutationObserver(() => {
          try {
            const match = String(counter.textContent || "").match(/Round\s+(\d+)/i);
            if (!match) return;
            const value = Number(match[1]);
            if (!Number.isFinite(value)) return;
            tracker.values.push(value);
            if (value < tracker.threshold) {
              tracker.regressed = true;
            }
          } catch {}
        });
        observer.observe(counter, {
          childList: true,
          subtree: true,
          characterData: true
        });
        window.__roundObserverTracker = tracker;
        window.__stopRoundObserver = () => observer.disconnect();
      }, expectedMinimum);

      // Click next round
      await nextButton.click();

      await expect.poll(readRoundNumber).toBeGreaterThanOrEqual(expectedMinimum);

      // Verify round progression without regression
      const afterNext = await readRoundNumber();
      expect(afterNext).not.toBeNull();
      expect(/** @type {number} */ (afterNext)).toBeGreaterThanOrEqual(expectedMinimum);

      const observedValues = await page.evaluate(() => {
        const tracker = window.__roundObserverTracker;
        return Array.isArray(tracker?.values) ? tracker.values.slice() : [];
      });
      if (observedValues.length > 0) {
        expect(Math.min(...observedValues)).toBeGreaterThanOrEqual(expectedMinimum);
      } else {
        expect(beforeNextNumber).toBeGreaterThanOrEqual(expectedMinimum);
      }

      const regressed = await page.evaluate(() =>
        Boolean(window.__roundObserverTracker?.regressed)
      );
      expect(regressed).toBe(false);

      await page.evaluate(() => {
        try {
          window.__stopRoundObserver?.();
        } catch {}
        window.__stopRoundObserver = undefined;
        window.__roundObserverTracker = undefined;
        if (typeof window.__restoreRoundsPlayed === "function") {
          try {
            window.__restoreRoundsPlayed();
          } catch {}
        }
        window.__restoreRoundsPlayed = undefined;
      });

      // Second round should work the same way
      const secondStat = page.locator(selectors.statButton(0)).nth(1);
      await secondStat.click();

      // Should resolve second round
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);
    });
  });

  test.describe("Opponent Delay Scenarios", () => {
    test("handles very short opponent delays gracefully", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      // Set very short delay
      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(10);
      });

      const firstStat = page.locator("#stat-buttons button[data-stat]").first();
      await firstStat.click();

      // Should still show message briefly
      const snackbar = page.locator(selectors.snackbarContainer());
      await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 200 });

      // Should resolve quickly
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);
    });

    test("handles long opponent delays without timing out", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 15 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      // Set longer delay
      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(500);
      });

      const firstStat = page.locator(selectors.statButton(0)).first();
      await firstStat.click();

      // Should show message for longer period
      const snackbar = page.locator(selectors.snackbarContainer());
      await expect(snackbar).toContainText(/Opponent is choosing/i);

      // Should eventually resolve
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/, { timeout: 2000 });
    });
  });

  test.describe("Edge Cases and Error Handling", () => {
    test("handles rapid stat selections gracefully", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(50);
      });

      // Click multiple stats rapidly
      const stats = page.locator("#stat-buttons button[data-stat]");
      await stats.first().click();
      await stats.nth(1).click(); // Should be ignored

      // Should still resolve properly despite rapid clicks
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);
    });

    test("opponent reveal works when page is navigated during delay", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(200);
      });

      const firstStat = page.locator("#stat-buttons button[data-stat]").first();
      await firstStat.click();

      // Navigate away during opponent reveal
      await page.goto("/index.html");

      // Should not crash, page should load normally
      await expect(page.locator(".logo")).toBeVisible();
    });

    test("opponent reveal handles missing DOM elements gracefully", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });

      // Remove some DOM elements before loading
      await page.addInitScript(() => {
        document.addEventListener("DOMContentLoaded", () => {
          const snackbar = document.getElementById("snackbar-container");
          if (snackbar) snackbar.remove();
        });
      });

      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(50);
      });

      const firstStat = page.locator("#stat-buttons button[data-stat]").first();
      await firstStat.click();

      // Should still resolve even without snackbar
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);
    });
  });

  test.describe("State Management and Cleanup", () => {
    test("opponent reveal state is properly managed between rounds", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 8 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      // Start 2-round match
      await page.waitForSelector("#round-select-2", { state: "visible" });
      await page.click("#round-select-2");

      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(100);
      });

      // First round
      const firstStat = page.locator("#stat-buttons button[data-stat]").first();
      await firstStat.click();

      // Wait for first round to complete
      await expect(page.locator("#next-button")).toBeEnabled();
      await page.locator("#next-button").click();

      // Second round should work independently without regressing
      await expect
        .poll(() => readScoreboardRound(page.locator("#round-counter")))
        .toBeGreaterThanOrEqual(2);

      const secondStat = page.locator("#stat-buttons button[data-stat]").nth(1);
      await secondStat.click();

      // Should resolve second round
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);
    });

    test("opponent reveal cleans up properly on match end", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      // Start 1-round match
      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(50);
      });

      const firstStat = page.locator("#stat-buttons button[data-stat]").first();
      await firstStat.click();

      const snackbar = page.locator("#snackbar-container");
      await expect(snackbar).toContainText(/Opponent is choosing/i);

      // Wait for match to end
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);

      // Final round should not transition into the cooldown countdown message
      await expect(snackbar).not.toContainText(/Next round in/i);

      const finalText = ((await snackbar.textContent()) || "").trim();
      expect(finalText === "" || /Opponent is choosing/i.test(finalText)).toBeTruthy();
    });
  });

  test.describe("Integration with Battle Features", () => {
    test("opponent reveal works with different stat selections", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 5 };
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(50);
      });

      // Test different stat selections
      const stats = page.locator(selectors.statButton(0));
      const statCount = await stats.count();

      for (let i = 0; i < Math.min(statCount, 3); i++) {
        const stat = stats.nth(i);
        await stat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i);

        await expect(page.locator(selectors.scoreDisplay())).toContainText(/You:\s*\d/);

        // Reset for next iteration if not last
        if (i < Math.min(statCount, 3) - 1) {
          await page.reload();
          await page.waitForSelector("#round-select-1", { state: "visible" });
          await page.click("#round-select-1");
          await page.evaluate(async () => {
            const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
            setOpponentDelay(50);
          });
        }
      }
    });

    test("opponent reveal integrates with timer functionality", async ({ page }) => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 3 }; // Short timer
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await page.waitForSelector("#round-select-1", { state: "visible" });
      await page.click("#round-select-1");

      await page.evaluate(async () => {
        const { setOpponentDelay } = await import("/src/helpers/classicBattle/snackbar.js");
        setOpponentDelay(100);
      });

      // Don't click any stat - let timer expire
      await page.waitForTimeout(3500); // Wait for timer to expire

      // Should auto-select and resolve
      await expect(page.locator("#score-display")).toContainText(/You:\s*\d/);
    });
  });
});
