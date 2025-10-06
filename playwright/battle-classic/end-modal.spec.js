import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import { waitForModalOpen } from "../fixtures/waits.js";
import { waitForRoundStats } from "../helpers/battleStateHelper.js";

async function waitForBattleInitialization(page) {
  const getBattleStoreReady = () =>
    page.evaluate(() => {
      const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
      return Boolean(store && typeof store === "object");
    });

  await expect.poll(getBattleStoreReady, { timeout: 20000 }).toBeTruthy();
}

async function applyQuickWinTarget(page, { waitForEngine = true, timeout = 5000 } = {}) {
  await page.evaluate(async () => {
    // Use the injected fixture function
    if (window.testFixtures?.classicQuickWin?.apply) {
      await window.testFixtures.classicQuickWin.apply();
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

  const ensureTargetApplied = () =>
    page.evaluate(async () => {
      // Use the injected fixture function
      if (window.testFixtures?.classicQuickWin?.readTarget) {
        return window.testFixtures.classicQuickWin.readTarget();
      } else {
        const store = window.battleStore;
        const engine = store?.engine;
        if (engine && typeof engine.getPointsToWin === "function") {
          try {
            return Number(engine.getPointsToWin());
          } catch {}
        }
        return null;
      }
    });

  await expect.poll(ensureTargetApplied, { timeout }).toBeTruthy();
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

  // Inject classicQuickWin fixture functions
  await page.addInitScript(`
    let facadePromise = null;
    let facade = null;

    async function ensureFacade() {
      if (!facadePromise) {
        facadePromise = import("/src/helpers/battleEngineFacade.js")
          .then((module) => {
            facade = module;
            return module;
          })
          .catch((error) => {
            try {
              console.warn("[test] quick win facade import failed", error);
            } catch {}
            facadePromise = null;
            return null;
          });
      }
      return facadePromise;
    }

    async function apply() {
      const facade = await ensureFacade();
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
    }

    function readTarget() {
      try {
        if (facade && typeof facade.getPointsToWin === "function") {
          return Number(facade.getPointsToWin());
        }
      } catch {}
      return null;
    }

    window.testFixtures = window.testFixtures || {};
    window.testFixtures.classicQuickWin = { apply, readTarget };
  `);

  await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
  await waitForBattleInitialization(page);
  await applyQuickWinTarget(page, { waitForEngine: false });
}

async function selectAdvantagedStat(page) {
  await waitForRoundStats(page);

  const statKey = await page.evaluate(() => {
    const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
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
    const keys = Array.from(
      new Set([...Object.keys(playerStats ?? {}), ...Object.keys(opponentStats ?? {})])
    );

    let bestNormalized = null;
    let bestDelta = Number.NEGATIVE_INFINITY;

    const readStatValue = (stats, key) => {
      if (!stats || typeof stats !== "object") {
        return Number.NaN;
      }
      const normalizedKey = String(key).trim().toLowerCase();
      const direct = stats[key];
      if (Number.isFinite(Number(direct))) {
        return Number(direct);
      }
      if (normalizedKey !== key && Number.isFinite(Number(stats[normalizedKey]))) {
        return Number(stats[normalizedKey]);
      }
      return Number.NaN;
    };

    for (const key of keys) {
      const normalized = String(key).trim().toLowerCase();
      const playerValue = readStatValue(playerStats, key);
      const opponentValue = readStatValue(opponentStats, key);

      if (!Number.isFinite(playerValue) || !Number.isFinite(opponentValue)) {
        continue;
      }

      const delta = playerValue - opponentValue;
      if (delta > bestDelta) {
        bestDelta = delta;
        bestNormalized = normalized;
      }
    }

    if (bestNormalized && Number.isFinite(bestDelta) && bestDelta > 0) {
      return bestNormalized;
    }

    const firstButton = document.querySelector("#stat-buttons button[data-stat]");
    if (!firstButton) {
      return null;
    }
    const datasetValue = firstButton.getAttribute("data-stat") ?? firstButton.dataset?.stat;
    if (typeof datasetValue === "string" && datasetValue.trim()) {
      return datasetValue.trim();
    }
    return null;
  });

  if (typeof statKey === "string" && statKey) {
    const normalizedStat = statKey.trim();
    const escapedStat = normalizedStat.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const statButton = page.locator(`#stat-buttons button[data-stat='${escapedStat}']`);
    await expect(statButton).toBeVisible();
    await statButton.click();
    return;
  }

  const fallbackButton = page.locator("#stat-buttons button[data-stat]").first();
  await expect(fallbackButton).toBeVisible();
  await fallbackButton.click();
}

async function resolveMatchFromCurrentRound(
  page,
  { timeout = 15000, statSelector = selectAdvantagedStat } = {}
) {
  const matchPromise = page.evaluate((limit) => {
    const api = window.__TEST_API?.state;
    if (!api?.waitForMatchCompletion) {
      throw new Error("waitForMatchCompletion helper unavailable");
    }
    return api.waitForMatchCompletion(limit);
  }, timeout);

  if (typeof statSelector !== "function") {
    throw new Error("A stat selection strategy function is required to resolve the match.");
  }

  await statSelector(page);

  const match = await matchPromise;
  if (!match) {
    throw new Error("Failed to observe match completion payload.");
  }
  if (match.timedOut) {
    throw new Error("Match did not conclude before timeout.");
  }

  const detailScores = match.scores ?? match.detail?.scores ?? null;
  if (!detailScores) {
    throw new Error(
      `Match completion payload did not include scores. Received: ${JSON.stringify(match)}`
    );
  }

  const normalizedScores = {
    player: Number(detailScores.player),
    opponent: Number(detailScores.opponent)
  };

  if (!Number.isFinite(normalizedScores.player) || !Number.isFinite(normalizedScores.opponent)) {
    throw new Error(
      `Match completion payload contained non-numeric scores. Player: ${detailScores.player}, Opponent: ${detailScores.opponent}`
    );
  }

  return {
    ...match,
    scores: normalizedScores
  };
}

function expectDecisiveFinalScore(scores) {
  expect(scores).toBeTruthy();
  expect(scores.player === scores.opponent).toBe(false);
  expect(scores.player >= 0 && scores.opponent >= 0).toBe(true);
  expect(scores.player >= 1 || scores.opponent >= 1).toBe(true);
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

        // Resolve the round using the deterministic stat selection helper
        const match = await resolveMatchFromCurrentRound(page);
        const { scores } = match;
        expect(match.timedOut).toBe(false);

        // Verify match completion
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

        // Confirm the match end modal is presented to the user
        await waitForModalOpen(page);
        const matchEndModal = page.locator("#match-end-modal").first();
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

        const match = await resolveMatchFromCurrentRound(page);
        const { scores } = match;
        expect(match.timedOut).toBe(false);

        // Verify score display shows completion
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toBeVisible();

        // Verify score contains expected format
        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toContain(`You: ${scores.player}`);
        expect(scoreText).toContain(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

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

        const match = await resolveMatchFromCurrentRound(page);
        const { scores } = match;
        expect(match.timedOut).toBe(false);

        // Verify match ended
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

        // Check if replay button exists and is functional
        const replayButton = page
          .locator("#match-replay-button, #replay-button, [data-testid='replay-button']")
          .first();
        if ((await replayButton.count()) > 0) {
          await expect(replayButton).toBeVisible();

          await waitForModalOpen(page);

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

        const match = await resolveMatchFromCurrentRound(page);
        const { scores } = match;
        expect(match.timedOut).toBe(false);
        expect(errors.length).toBe(0);

        // Verify match completed successfully
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

        // Dismiss the end modal by clicking replay to continue
        await page.click("#match-replay-button");

        // Verify page layout remains intact after replay
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

        // Select a stat to complete the round and trigger match end
        await page.click("#stat-buttons button[data-stat='speed']");

        // Wait for match to complete and modal to appear
        await waitForModalOpen(page);

        // Get match result from the modal context
        const scores = await page.evaluate(() => {
          const desc = document.getElementById("match-end-desc");
          if (!desc || !desc.textContent) return null;
          const match = desc.textContent.match(/\((\d+)-(\d+)\)/);
          if (!match) return null;
          return { player: parseInt(match[1]), opponent: parseInt(match[2]) };
        });

        expect(scores).toBeTruthy();
        expectDecisiveFinalScore(scores);

        // Verify score display is clear and readable
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toBeVisible();

        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toBeTruthy();
        expect(scoreText.length).toBeGreaterThan(5); // Should contain meaningful score info

        // Verify score display is properly formatted
        expect(scoreText).toContain(`You: ${scores.player}`);
        expect(scoreText).toContain(`Opponent: ${scores.opponent}`);
      }, ["log", "info", "warn", "error", "debug"]));

    test("provides stable interface after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");

        // Select a stat to complete the round and trigger match end
        await page.click("#stat-buttons button[data-stat='speed']");

        // Wait for match to complete
        await page.waitForSelector("#match-end-modal", { timeout: 5000 });

        // Get scores from the page
        const scoreDisplay = page.locator("#score-display");
        const scoreText = await scoreDisplay.textContent();
        const scoreMatch = scoreText.match(/You: (\d+).*Opponent: (\d+)/);
        expect(scoreMatch).toBeTruthy();
        const scores = { player: parseInt(scoreMatch[1]), opponent: parseInt(scoreMatch[2]) };
        expectDecisiveFinalScore(scores);

        // Verify interface remains stable with modal present
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

        const match = await resolveMatchFromCurrentRound(page);
        const { scores } = match;
        expect(match.timedOut).toBe(false);
        expect(errors.length).toBe(0);

        // Verify match completed without throwing errors
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);
      }, ["log", "info", "warn", "error", "debug"]));

    test("maintains functionality after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page, { cooldown: 300 });

        // Complete first match
        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        const match = await resolveMatchFromCurrentRound(page);
        const { scores } = match;
        expect(match.timedOut).toBe(false);

        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });

  test("end modal appears after match completion", async ({ page }) => {
    await prepareClassicBattle(page);

    // Start and complete match
    await page.click("#round-select-2");
    await applyQuickWinTarget(page);
    await page.waitForSelector("#stat-buttons button[data-stat]");

    const match = await resolveMatchFromCurrentRound(page);
    expect(match.timedOut).toBe(false);

    // Confirm the match end modal is presented to the user
    await waitForModalOpen(page);
    const matchEndModal = page.locator("#match-end-modal").first();
    await expect(matchEndModal).toBeVisible();

    // Wait for and verify end modal appears
    const matchEndTitle = page.locator("#match-end-title").first();
    await matchEndTitle.waitFor({ state: "visible" });
    await expect(matchEndTitle).toHaveText("Match Over");

    // Verify modal has replay and quit buttons
    await expect(page.locator("#match-replay-button").first()).toBeVisible();
    await expect(page.locator("#match-quit-button").first()).toBeVisible();
  });
});
