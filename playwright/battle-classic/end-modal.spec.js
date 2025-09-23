import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";

async function waitForBattleInitialization(page) {
  await page.waitForFunction(
    () => typeof window !== "undefined" && Boolean(window.battleStore),
    undefined,
    { timeout: 20000 }
  );
}

async function applyQuickWinTarget(page, { waitForEngine = true, timeout = 5000 } = {}) {
  await page.evaluate(async () => {
    const helper = window.__classicQuickWin;
    if (helper && typeof helper.apply === "function") {
      await helper.apply();
    } else {
      const store = window.battleStore;
      const engine = store?.engine;
      if (engine && typeof engine.setPointsToWin === "function") {
        try {
          engine.setPointsToWin(1);
        } catch {}
      }
    }
  });

  if (!waitForEngine) {
    return;
  }

  await page.waitForFunction(
    () => {
      const helper = window.__classicQuickWin;
      if (helper && typeof helper.readTarget === "function") {
        return helper.readTarget() === 1;
      }
      const store = window.battleStore;
      const engine = store?.engine;
      if (!engine) {
        return false;
      }
      const getter =
        typeof engine.getPointsToWin === "function" ? engine.getPointsToWin() : engine.pointsToWin;
      return Number(getter) === 1;
    },
    undefined,
    { timeout }
  );
}

async function prepareClassicBattle(page, { seed = 42, cooldown = 500 } = {}) {
  await page.addInitScript(
    ({ cooldownMs, rngSeed }) => {
      window.__OVERRIDE_TIMERS = { roundTimer: 1 };
      window.__NEXT_ROUND_COOLDOWN_MS = cooldownMs;
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST_MODE = { enabled: true, seed: rngSeed };
    },
    { cooldownMs: cooldown, rngSeed: seed }
  );

  await page.addInitScript(() => {
    const helperKey = "__classicQuickWin";
    if (typeof window !== "undefined" && !window[helperKey]) {
      window[helperKey] = {
        facadePromise: null,
        facade: null,
        ensureFacade() {
          if (!this.facadePromise) {
            this.facadePromise = import("/src/helpers/battleEngineFacade.js")
              .then((module) => {
                this.facade = module;
                return module;
              })
              .catch((error) => {
                try {
                  console.warn("[test] quick win facade import failed", error);
                } catch {}
                this.facadePromise = null;
                return null;
              });
          }
          return this.facadePromise;
        },
        async apply() {
          const facade = await this.ensureFacade();
          if (!facade || typeof facade.setPointsToWin !== "function") {
            return false;
          }
          try {
            facade.setPointsToWin(1);
            if (typeof facade.getPointsToWin === "function") {
              const current = Number(facade.getPointsToWin());
              if (current !== 1) {
                facade.setPointsToWin(1);
                return Number(facade.getPointsToWin()) === 1;
              }
              return true;
            }
            return true;
          } catch (error) {
            try {
              console.warn("[test] quick win apply failed", error);
            } catch {}
            return false;
          }
        },
        readTarget() {
          try {
            if (this.facade && typeof this.facade.getPointsToWin === "function") {
              return Number(this.facade.getPointsToWin());
            }
          } catch {}
          try {
            const engine = window.battleStore?.engine;
            if (engine) {
              if (typeof engine.getPointsToWin === "function") {
                return Number(engine.getPointsToWin());
              }
              if (typeof engine.pointsToWin === "number") {
                return Number(engine.pointsToWin);
              }
            }
          } catch {}
          return null;
        }
      };
    }
  });

  await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
  await waitForBattleInitialization(page);
  await applyQuickWinTarget(page, { waitForEngine: false });
}

async function selectAdvantagedStat(page) {
  const statKey = await page.evaluate(() => {
    const store = window.battleStore;
    if (!store || typeof store !== "object") {
      return null;
    }
    const player = store.currentPlayerJudoka;
    const opponent = store.currentOpponentJudoka;
    if (!player?.stats || !opponent?.stats) {
      return null;
    }

    const playerStats = player.stats;
    const opponentStats = opponent.stats;
    const keys = Object.keys(playerStats);

    let bestKey = null;
    let bestNormalized = null;
    let bestDelta = Number.NEGATIVE_INFINITY;

    for (const key of keys) {
      const normalized = String(key).trim().toLowerCase();
      const playerRaw = playerStats[key] ?? playerStats[normalized] ?? 0;
      const opponentRaw = opponentStats[key] ?? opponentStats[normalized] ?? 0;

      const playerValue =
        typeof playerRaw === "number" && !Number.isNaN(playerRaw)
          ? playerRaw
          : Number(playerRaw) || 0;
      const opponentValue =
        typeof opponentRaw === "number" && !Number.isNaN(opponentRaw)
          ? opponentRaw
          : Number(opponentRaw) || 0;

      const delta = playerValue - opponentValue;
      if (delta > bestDelta) {
        bestDelta = delta;
        bestKey = key;
        bestNormalized = normalized;
      }
    }

    if (!bestKey) {
      return null;
    }

    if (bestDelta <= 0) {
      const boost = Math.abs(bestDelta) + 1;
      const normalizedKey = String(bestKey).trim().toLowerCase();
      const baseValue =
        typeof playerStats[bestKey] === "number" && !Number.isNaN(playerStats[bestKey])
          ? playerStats[bestKey]
          : Number(playerStats[bestKey]) || 0;

      playerStats[bestKey] = baseValue + boost;
      playerStats[normalizedKey] = playerStats[bestKey];
      opponentStats[bestKey] = 0;
      opponentStats[normalizedKey] = opponentStats[bestKey];
      return normalizedKey;
    }

    return bestNormalized;
  });

  const normalizedStat = typeof statKey === "string" && statKey ? statKey : "power";
  await page.click(`#stat-buttons button[data-stat='${normalizedStat}']`);
}

async function waitForScoreDisplay(page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const scoreNode = document.getElementById("score-display");
      if (!scoreNode) return false;
      const text = scoreNode.textContent || "";
      return /You:\s*1/.test(text) && /Opponent:\s*0/.test(text);
    },
    undefined,
    { timeout }
  );
}

async function waitForMatchCompletion(page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const modal = document.querySelector("#match-end-modal");
      const store = window.battleStore;
      const engine = store?.engine;
      const matchEnded = engine?.matchEnded === true;
      const round = store?.round;
      const roundResolving = round?.resolving === true;

      // Check if modal is visible
      let modalVisible = false;
      if (modal) {
        const ariaHidden = modal.getAttribute("aria-hidden");
        if (ariaHidden !== "true") {
          modalVisible = true;
        } else if (typeof modal.matches === "function" && modal.matches(":not([hidden])")) {
          modalVisible = true;
        }
      }

      // If match ended but modal not visible, capture diagnostics
      if (matchEnded && !modalVisible && !roundResolving) {
        // Capture diagnostics for debugging
        const diagnostics = {
          modalExists: !!modal,
          modalAttributes: modal ? {
            id: modal.id,
            className: modal.className,
            style: modal.style.cssText,
            ariaHidden: modal.getAttribute("aria-hidden"),
            hidden: modal.hidden,
            innerHTML: modal.innerHTML.substring(0, 500) // Truncate for readability
          } : null,
          battleStore: {
            matchEnded: engine?.matchEnded,
            pointsToWin: engine?.pointsToWin,
            currentRound: store?.currentRound,
            round: round ? {
              resolving: round.resolving,
              state: round.state
            } : null
          },
          timestamp: new Date().toISOString()
        };

        // Store diagnostics on window for retrieval
        window.__endModalDiagnostics = diagnostics;

        // Log to console for immediate visibility
        console.warn("[TEST DIAGNOSTIC] Match ended but end modal not visible:", diagnostics);
      }

      // Return true if modal is visible or match ended and round not resolving
      return modalVisible || (matchEnded && !roundResolving);
    },
    undefined,
    { timeout }
  );
}

test.describe("Classic Battle End Game Flow", () => {
  test.describe("Match Completion Scenarios", () => {
    test("completes match with first-to-1 win condition", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page, { seed: 5 });

        // Start match
        await page.click("#round-select-2");
        await applyQuickWinTarget(page);

        // Wait for cards and stat buttons
        await page.waitForSelector("#stat-buttons button[data-stat]");

        // Choose a stat with a deterministic advantage for the player
        await selectAdvantagedStat(page);

        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);

        // Verify match completion
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(/You:\s*1/);
        await expect(scoreDisplay).toContainText(/Opponent:\s*0/);

        // Confirm the match end modal is presented to the user
        const matchEndModal = page.locator("#match-end-modal").first();
        await matchEndModal.waitFor({ state: "visible" });
        await expect(matchEndModal).toBeVisible();

        // Wait for and verify end modal appears
        const matchEndTitle = page.locator("#match-end-title").first();
        await matchEndTitle.waitFor({ state: "visible" });
        await expect(matchEndTitle).toHaveText("Match Over");

        // Verify modal has replay and quit buttons
        await expect(page.locator("#match-replay-button").first()).toBeVisible();
        await expect(page.locator("#match-quit-button").first()).toBeVisible();

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
        await expect(page.locator("header, .header")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));

    test("handles match completion and score display", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        // Start and complete match
        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);

        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);

        // Verify score display shows completion
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toBeVisible();

        // Verify score contains expected format
        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toMatch(/You:\s*1/);
        expect(scoreText).toMatch(/Opponent:\s*0/);

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });

  test.describe("Replay Functionality", () => {
    test("replay button is available after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        // Complete a match first
        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);

        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);

        // Verify match ended
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(/You:\s*1/);
        await expect(scoreDisplay).toContainText(/Opponent:\s*0/);

        // Check if replay button exists and is functional
        const replayButton = page
          .locator("#match-replay-button, #replay-button, [data-testid='replay-button']")
          .first();
        if ((await replayButton.count()) > 0) {
          await expect(replayButton).toBeVisible();

          const modalOverlay = page.locator("#match-end-modal").first();
          await modalOverlay.waitFor({ state: "visible" });

          // Test replay functionality if button is available
          await replayButton.focus();
          await expect(replayButton).toBeFocused();
          await replayButton.press("Enter");

          // Verify page remains functional after replay
          await expect(page.locator("body")).toBeVisible();
        }
      }, ["log", "info", "warn", "error", "debug"]));

    test("match completion maintains page stability", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        const errors = [];
        page.on("pageerror", (error) => errors.push(error));

        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);

        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);
        expect(errors.length).toBe(0);

        // Verify match completed successfully
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(/You:\s*1/);
        await expect(scoreDisplay).toContainText(/Opponent:\s*0/);

        // Verify page layout remains intact
        await expect(page.locator("header, .header")).toBeVisible();
        await expect(page.locator("#score-display")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });

  test.describe("End Game UI Elements", () => {
    test("displays score information clearly after match", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);

        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);

        // Verify score display is clear and readable
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toBeVisible();

        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toBeTruthy();
        expect(scoreText.length).toBeGreaterThan(5); // Should contain meaningful score info

        // Verify score display is properly formatted
        expect(scoreText).toMatch(/You:\s*1/);
        expect(scoreText).toMatch(/Opponent:\s*0/);
      }, ["log", "info", "warn", "error", "debug"]));

    test("provides stable interface after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);

        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);

        // Verify match completed
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(/You:\s*1/);
        await expect(scoreDisplay).toContainText(/Opponent:\s*0/);

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
        await prepareClassicBattle(page);

        const errors = [];
        page.on("pageerror", (error) => errors.push(error));

        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);

        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);
        expect(errors.length).toBe(0);

        // Verify match completed without throwing errors
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(/You:\s*1/);
        await expect(scoreDisplay).toContainText(/Opponent:\s*0/);
      }, ["log", "info", "warn", "error", "debug"]));

    test("maintains functionality after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page, { cooldown: 300 });

        // Complete first match
        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);
        await waitForScoreDisplay(page);
        await waitForMatchCompletion(page);

        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(/You:\s*1/);
        await expect(scoreDisplay).toContainText(/Opponent:\s*0/);

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });
});
