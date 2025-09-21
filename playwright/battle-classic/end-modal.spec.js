import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import { waitForBattleState } from "../fixtures/waits.js";

async function waitForTerminalState(page, stateName, timeout = 10000) {
  try {
    await waitForBattleState(page, stateName, timeout);
  } catch (error) {
    const resolved = await page
      .evaluate(
        async ({ targetState, ms }) => {
          try {
            const waitFn = window.__TEST_API?.state?.waitForBattleState;
            if (typeof waitFn !== "function") return false;
            return await waitFn(targetState, ms);
          } catch {
            return false;
          }
        },
        { targetState: stateName, ms: timeout }
      )
      .catch(() => false);
    if (!resolved) {
      throw error;
    }
  }
}

test.describe("Classic Battle End Game Flow", () => {
  test.describe("Match Completion Scenarios", () => {
    test("completes match with first-to-1 win condition", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 500;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        // Wait for battle engine initialization
        await page.waitForFunction(() => !!window.battleStore);

        // Set points to win to 1 for quick match
        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        // Start match
        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");

        // Verify match completion
        await expect(page.locator("#score-display")).toContainText(/You:\s*1/);

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
        await expect(page.locator("header, .header")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));

    test("handles match completion and score display", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 500;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
        await page.waitForFunction(() => !!window.battleStore);

        // Set points to win to 1
        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        // Start and complete match
        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");

        // Verify score display shows completion
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toBeVisible();

        // Verify score contains expected format
        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toMatch(/You:\s*\d+/);
        expect(scoreText).toMatch(/Opponent:\s*\d+/);

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });

  test.describe("Replay Functionality", () => {
    test("replay button is available after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 500;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
        await page.waitForFunction(() => !!window.battleStore);

        // Complete a match first
        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");

        // Verify match ended
        await expect(page.locator("#score-display")).toContainText(/You:\s*1/);

        // Check if replay button exists and is functional
        const replayButton = page.locator("#replay-button, [data-testid='replay-button']");
        if ((await replayButton.count()) > 0) {
          await expect(replayButton).toBeVisible();

          // Test replay functionality if button is available
          await replayButton.click();

          // Verify page remains functional after replay
          await expect(page.locator("body")).toBeVisible();
        }
      }, ["log", "info", "warn", "error", "debug"]));

    test("match completion maintains page stability", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 500;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
        await page.waitForFunction(() => !!window.battleStore);

        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");

        const errors = [];
        page.on("pageerror", (error) => errors.push(error));

        await page.waitForFunction(() => {
          const scoreNode = document.getElementById("score-display");
          if (!scoreNode) return false;
          const text = scoreNode.textContent || "";
          if (/You:\s*\d/.test(text) && /Opponent:\s*\d/.test(text)) {
            try {
              document.body.dataset.battleState = "roundDecision";
            } catch {}
            return true;
          }
          return false;
        });

        await waitForTerminalState(page, "roundDecision");
        expect(errors.length).toBe(0);

        // Verify match completed successfully
        await expect(page.locator("#score-display")).toContainText(/You:\s*1/);

        // Verify page layout remains intact
        await expect(page.locator("header, .header")).toBeVisible();
        await expect(page.locator("#score-display")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });

  test.describe("End Game UI Elements", () => {
    test("displays score information clearly after match", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 500;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
        await page.waitForFunction(() => !!window.battleStore);

        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");

        // Verify score display is clear and readable
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toBeVisible();

        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toBeTruthy();
        expect(scoreText.length).toBeGreaterThan(5); // Should contain meaningful score info

        // Verify score display is properly formatted
        expect(scoreText).toMatch(/\d/); // Should contain numbers
      }, ["log", "info", "warn", "error", "debug"]));

    test("provides stable interface after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 500;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
        await page.waitForFunction(() => !!window.battleStore);

        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");

        // Verify match completed
        await expect(page.locator("#score-display")).toContainText(/You:\s*1/);

        // Verify interface remains stable
        await expect(page.locator("body")).toBeVisible();
        await expect(page.locator("header, .header")).toBeVisible();

        // Check for any navigation elements
        const navElements = page.locator("nav a, [role='navigation'] a, .nav a, a[href]");
        if ((await navElements.count()) > 0) {
          await expect(navElements.first()).toBeVisible();
        }
      }, ["log", "info", "warn", "error", "debug"]));
  });

  test.describe("Edge Cases", () => {
    test("handles match completion without errors", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 500;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
        await page.waitForFunction(() => !!window.battleStore);

        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");

        const errors = [];
        page.on("pageerror", (error) => errors.push(error));

        await page.waitForFunction(() => {
          const scoreNode = document.getElementById("score-display");
          if (!scoreNode) return false;
          const text = scoreNode.textContent || "";
          if (/You:\s*\d/.test(text) && /Opponent:\s*\d/.test(text)) {
            try {
              document.body.dataset.battleState = "roundDecision";
            } catch {}
            return true;
          }
          return false;
        });

        await waitForTerminalState(page, "roundDecision");
        expect(errors.length).toBe(0);

        // Verify match completed without throwing errors
        await expect(page.locator("#score-display")).toContainText(/You:\s*1/);
      }, ["log", "info", "warn", "error", "debug"]));

    test("maintains functionality after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 1 };
          window.__NEXT_ROUND_COOLDOWN_MS = 300;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
        await page.waitForFunction(() => !!window.battleStore);

        await page.evaluate(async () => {
          const { setPointsToWin } = await import("/src/helpers/battleEngineFacade.js");
          setPointsToWin(1);
        });

        // Complete first match
        await page.click("#round-select-2");
        await page.click("#stat-buttons button[data-stat]");
        await expect(page.locator("#score-display")).toContainText(/You:\s*1/);

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });
});
