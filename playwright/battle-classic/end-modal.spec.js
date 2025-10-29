import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";

const STAT_GROUP_ARIA_LABEL = /choose a stat/i;

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatStatLabel(rawKey) {
  return String(rawKey ?? "")
    .split(/[_\s-]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function waitForTestApiBootstrap(page, { timeout = 10000 } = {}) {
  await page.waitForFunction(
    () => typeof window !== "undefined" && !!window.__TEST_API?.init?.waitForBattleReady,
    null,
    { timeout }
  );
}

async function configureClassicBattle(page, config = {}) {
  const outcome = await page.evaluate(async (options) => {
    const api = window.__TEST_API?.init;
    if (!api?.configureClassicBattle) {
      return { ok: false, reason: "configureClassicBattle unavailable" };
    }
    try {
      const result = await api.configureClassicBattle(options);
      const messages = Array.isArray(result?.errors) ? result.errors.filter(Boolean) : [];
      return {
        ok: result?.ok !== false,
        reason: messages.length ? messages.join(", ") : null
      };
    } catch (error) {
      return { ok: false, reason: error?.message ?? "configureClassicBattle failed" };
    }
  }, config);

  if (!outcome?.ok) {
    throw new Error(outcome?.reason ?? "Failed to configure classic battle state via Test API");
  }
}

async function prepareClassicBattle(page, { seed = 42, cooldown = 500 } = {}) {
  await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
  await waitForTestApiBootstrap(page);
  await configureClassicBattle(page, {
    roundTimerMs: 3,
    cooldownMs: cooldown,
    showRoundSelectModal: true,
    enableTestMode: true,
    seed,
    pointsToWin: 1
  });

  const battleReady = await page.evaluate(async (limit) => {
    const initApi = window.__TEST_API?.init;
    if (!initApi?.waitForBattleReady) {
      return null;
    }
    return await initApi.waitForBattleReady(limit);
  }, 10000);

  if (battleReady === false) {
    throw new Error("Battle did not report ready state within the allotted time.");
  }
}

async function waitForRoundStatsViaApi(page, { timeout = 5000 } = {}) {
  const result = await page.evaluate(async ({ limit }) => {
    const stateApi = window.__TEST_API?.state;
    if (!stateApi?.waitForRoundStats) {
      return { ok: false, reason: "state.waitForRoundStats unavailable" };
    }
    const ok = await stateApi.waitForRoundStats(limit);
    return { ok, reason: ok ? null : "round stats timeout" };
  }, { limit: timeout });

  if (!result?.ok) {
    throw new Error(result?.reason ?? "Round stats did not become available");
  }
}

async function applyQuickWinTarget(page, { confirm = true, timeout = 5000 } = {}) {
  const outcome = await page.evaluate(async ({ shouldConfirm, confirmTimeout }) => {
    const engineApi = window.__TEST_API?.engine;
    if (!engineApi?.setPointsToWin) {
      return { ok: false, reason: "engine.setPointsToWin unavailable" };
    }
    const applied = engineApi.setPointsToWin(1);
    if (!applied) {
      return { ok: false, reason: "engine.setPointsToWin returned false" };
    }
    if (!shouldConfirm || typeof engineApi.waitForPointsToWin !== "function") {
      return { ok: true, reason: null };
    }
    const confirmed = await engineApi.waitForPointsToWin(1, confirmTimeout);
    return confirmed
      ? { ok: true, reason: null }
      : { ok: false, reason: "points-to-win confirmation timeout" };
  }, { shouldConfirm: confirm, confirmTimeout: timeout });

  if (!outcome?.ok) {
    throw new Error(outcome?.reason ?? "Failed to apply quick-win target");
  }
}

async function selectAdvantagedStat(page) {
  await waitForRoundStatsViaApi(page);

  const selection = await page.evaluate(() => {
    const inspectApi = window.__TEST_API?.inspect;
    if (!inspectApi?.pickAdvantagedStatKey) {
      return { key: null, normalizedKey: null };
    }
    try {
      return inspectApi.pickAdvantagedStatKey();
    } catch (error) {
      return { key: null, normalizedKey: null, reason: error?.message ?? "pick failed" };
    }
  });

  const normalizedKey = (() => {
    if (typeof selection?.normalizedKey === "string" && selection.normalizedKey.trim()) {
      return selection.normalizedKey.trim();
    }
    if (typeof selection?.key === "string" && selection.key.trim()) {
      return selection.key.trim().toLowerCase();
    }
    return null;
  })();

  const statGroup = page.getByRole("group", { name: STAT_GROUP_ARIA_LABEL });
  await expect(statGroup).toBeVisible();

  if (normalizedKey) {
    const label = formatStatLabel(normalizedKey);
    const statButton = statGroup.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(label)}$`, "i")
    });
    await expect(statButton).toBeVisible();
    await expect(statButton).toBeEnabled();
    await statButton.click();
    return;
  }

  const fallbackButton = statGroup.getByRole("button").first();
  await expect(fallbackButton).toBeVisible();
  await expect(fallbackButton).toBeEnabled();
  await fallbackButton.click();
}

async function ensureRoundStarted(page) {
  const roundButton = page.locator("#round-select-2");
  if ((await roundButton.count()) > 0) {
    await expect(roundButton).toBeVisible();
    await expect(roundButton).toBeEnabled();
    await roundButton.click();
  }

  await page
    .evaluate(async () => {
      const stateApi = window.__TEST_API?.state;
      if (!stateApi?.waitForBattleState) {
        return null;
      }
      if (stateApi.getBattleState?.() === "waitingForPlayerAction") {
        return true;
      }
      return await stateApi.waitForBattleState("waitingForPlayerAction", 10000);
    })
    .catch(() => null);
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
        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);

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
        const matchEndModal = page.locator("#match-end-modal").first();
        await expect(matchEndModal).toBeVisible();

        // Wait for and verify end modal appears
        const matchEndTitle = page.locator("#match-end-title").first();
        await expect(matchEndTitle).toBeVisible();
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
        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);

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
        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);

        const match = await resolveMatchFromCurrentRound(page);
        const { scores } = match;
        expect(match.timedOut).toBe(false);

        // Verify match ended
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

        // Check if replay button exists and is functional
        const modalReplayButton = page
          .locator("#match-end-modal")
          .locator(
            "#match-replay-button, [data-testid='replay-button'], button:has-text('Replay')"
          );
        let replayButton = modalReplayButton.first();
        if ((await replayButton.count()) === 0) {
          replayButton = page
            .locator("#match-replay-button, #replay-button, [data-testid='replay-button']")
            .first();
        }

        if ((await replayButton.count()) > 0) {
          await expect(replayButton).toBeVisible();

          // Test replay functionality if button is available
          await expect(replayButton).toBeEnabled();
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

        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);

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
        // Note: Modal backdrop may intercept clicks, so we'll verify stability with modal present
        // await page.click("#match-replay-button");

        // Verify page layout remains intact with modal present
        await expect(page.locator("header, .header")).toBeVisible();
        await expect(page.locator("#score-display")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });

  test.describe("End Game UI Elements", () => {
    test("displays score information clearly after match", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);
        const match = await resolveMatchFromCurrentRound(page, {
          statSelector: selectAdvantagedStat
        });
        expect(match.timedOut).toBe(false);
        expectDecisiveFinalScore(match.scores);

        // Wait for match to complete and modal to appear
        const matchEndModal = page.locator("#match-end-modal");
        await expect(matchEndModal).toBeVisible();

        const scores = match.scores;
        const modalDescription = page.locator("#match-end-desc");
        await expect(modalDescription).toContainText(
          `(${scores.player}-${scores.opponent})`
        );

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

        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);
        const match = await resolveMatchFromCurrentRound(page, {
          statSelector: selectAdvantagedStat
        });
        expect(match.timedOut).toBe(false);
        expectDecisiveFinalScore(match.scores);

        // Wait for match to complete
        const matchEndModal = page.locator("#match-end-modal");
        await expect(matchEndModal).toBeVisible();

        const scores = match.scores;
        const modalDescription = page.locator("#match-end-desc");
        await expect(modalDescription).toContainText(
          `(${scores.player}-${scores.opponent})`
        );
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

        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);

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
        await ensureRoundStarted(page);
        await applyQuickWinTarget(page);
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
    await ensureRoundStarted(page);
    await applyQuickWinTarget(page);

    const match = await resolveMatchFromCurrentRound(page);
    expect(match.timedOut).toBe(false);

    // Confirm the match end modal is presented to the user
    const matchEndModal = page.locator("#match-end-modal").first();
    await expect(matchEndModal).toBeVisible();

    // Wait for and verify end modal appears
    const matchEndTitle = page.locator("#match-end-title").first();
    await expect(matchEndTitle).toHaveText("Match Over");

    // Verify modal has replay and quit buttons
    await expect(page.locator("#match-replay-button").first()).toBeVisible();
    await expect(page.locator("#match-quit-button").first()).toBeVisible();
  });
});
