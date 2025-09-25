import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import { waitForModalOpen, waitForNextRoundReadyEvent } from "../fixtures/waits.js";
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

  const ensureTargetApplied = () =>
    page.evaluate(() => {
      const helper = window.__classicQuickWin;
      if (helper && typeof helper.readTarget === "function") {
        return helper.readTarget() === 1;
      }

      const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
      const engine = store?.engine;
      if (!engine) {
        return false;
      }

      const getter =
        typeof engine.getPointsToWin === "function" ? engine.getPointsToWin() : engine.pointsToWin;
      return Number(getter) === 1;
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

async function waitForScoreDisplay(page, { timeout = 10000, previousObservation = null } = {}) {
  const readScores = () =>
    page.evaluate(async (previous) => {
      const helper = window.__classicQuickWin;
      let facade = helper?.facade ?? null;

      if (!facade && helper?.ensureFacade) {
        try {
          facade = await helper.ensureFacade();
        } catch {}
      }

      if (!facade) {
        try {
          facade = await import("/src/helpers/battleEngineFacade.js");
          if (helper) {
            helper.facade = facade;
          }
        } catch {
          facade = null;
        }
      }

      const getScores = typeof facade?.getScores === "function" ? facade.getScores : null;
      if (!getScores) {
        return false;
      }

      let engineScores = null;
      let matchEnded = false;
      try {
        engineScores = getScores();
        matchEnded =
          typeof facade?.isMatchEnded === "function"
            ? facade.isMatchEnded()
            : (() => {
                try {
                  return facade.requireEngine?.().matchEnded === true;
                } catch {
                  return false;
                }
              })();
      } catch {
        return false;
      }

      let player = Number(engineScores?.playerScore ?? engineScores?.player ?? NaN);
      let opponent = Number(engineScores?.opponentScore ?? engineScores?.opponent ?? NaN);

      if (!Number.isFinite(player) || !Number.isFinite(opponent)) {
        try {
          const scoreNode = document.getElementById("score-display");
          if (!scoreNode) {
            return false;
          }
          const text = scoreNode.textContent || "";
          const match = text.match(/You:\s*(\d+)[\s\S]*Opponent:\s*(\d+)/i);
          if (!match) {
            return false;
          }
          player = Number(match[1]);
          opponent = Number(match[2]);
        } catch {
          return false;
        }
      }

      let roundNumber = null;
      try {
        const counter = document.getElementById("round-counter");
        if (counter) {
          const roundMatch = counter.textContent?.match(/(\d+)/);
          if (roundMatch) {
            const parsed = Number(roundMatch[1]);
            if (Number.isFinite(parsed)) {
              roundNumber = parsed;
            }
          }
          if (roundNumber === null) {
            const highest = Number(counter.dataset?.highestRound);
            if (Number.isFinite(highest)) {
              roundNumber = highest;
            }
          }
        }
      } catch {}

      if (
        previous &&
        typeof previous === "object" &&
        previous !== null &&
        roundNumber === previous.roundNumber &&
        player === previous.player &&
        opponent === previous.opponent
      ) {
        if (matchEnded) {
          return { player, opponent, roundNumber, matchEnded };
        }
        return previous.matchEnded ? previous : false;
      }

      return { player, opponent, roundNumber, matchEnded };
    }, previousObservation);

  let snapshot = null;
  const pollScores = async () => {
    const result = await readScores();
    if (result && typeof result === "object") {
      snapshot = result;
      return true;
    }
    return false;
  };

  await expect.poll(pollScores, { timeout }).toBeTruthy();

  if (!snapshot) {
    const fallback = await readScores();
    if (fallback && typeof fallback === "object") {
      snapshot = fallback;
    }
  }

  if (!snapshot) {
    throw new Error("Failed to observe score update from battle engine.");
  }

  return snapshot;
}

async function readDomScoreSnapshot(page) {
  return page.evaluate(() => {
    const parseScore = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const pickNumber = (source, keys) => {
      if (!source || typeof source !== "object") return null;
      for (const key of keys) {
        const parsed = parseScore(source[key]);
        if (parsed !== null) return parsed;
      }
      return null;
    };

    const node = document.getElementById("score-display");
    if (!node) return null;

    const dataset = node.dataset ?? {};
    const player = pickNumber(dataset, ["player", "playerScore", "you", "user"]);
    const opponent = pickNumber(dataset, ["opponent", "opponentScore", "cpu", "enemy"]);

    if (player !== null && opponent !== null) {
      const endedAttr = dataset.matchEnded ?? node.getAttribute?.("data-match-ended");
      const ended =
        typeof endedAttr === "boolean"
          ? endedAttr
          : typeof endedAttr === "string"
            ? endedAttr.trim().toLowerCase() === "true"
            : null;
      return { player, opponent, matchEnded: ended, domInferred: ended };
    }

    const textContent = node.textContent || "";
    const match = textContent.match(/You:[^0-9]*([0-9]+)[\s\S]*?Opponent:[^0-9]*([0-9]+)/i);
    if (match) {
      return {
        player: Number(match[1]),
        opponent: Number(match[2]),
        matchEnded: null,
        domInferred: null
      };
    }

    return null;
  });
}

function normalizeStoreSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== "object") {
    return null;
  }
  const player = Number(rawSnapshot.player);
  const opponent = Number(rawSnapshot.opponent);
  if (!Number.isFinite(player) || !Number.isFinite(opponent)) {
    return null;
  }
  const matchEnded =
    typeof rawSnapshot.ended === "boolean"
      ? rawSnapshot.ended
      : typeof rawSnapshot.ended === "string"
        ? /^(true|1|yes|on)$/i.test(rawSnapshot.ended.trim())
        : null;
  return { player, opponent, matchEnded, domInferred: null };
}

async function readStoreScoreSnapshot(page) {
  const rawSnapshot = await page.evaluate(() => {
    try {
      const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
      if (!store || typeof store !== "object") return null;

      const pickFirst = (source, keys) => {
        if (!source || typeof source !== "object") return null;
        for (const key of keys) {
          const value = source[key];
          if (value !== undefined && value !== null) {
            return value;
          }
        }
        return null;
      };

      const scoreCandidates = [
        store.scoreboard,
        store.scores,
        store.score,
        store.currentScore,
        store.engine?.scoreboard,
        store.engine?.scores
      ];

      for (const candidate of scoreCandidates) {
        if (!candidate || typeof candidate !== "object") continue;

        const player = pickFirst(candidate, [
          "player",
          "playerScore",
          "you",
          "user",
          "playerPoints"
        ]);
        const opponent = pickFirst(candidate, [
          "opponent",
          "opponentScore",
          "cpu",
          "enemy",
          "opponentPoints"
        ]);

        if (player !== null && opponent !== null) {
          const ended =
            candidate.matchEnded ??
            candidate.completed ??
            candidate.matchComplete ??
            candidate.finished ??
            null;
          return { player, opponent, ended };
        }
      }
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.debug === "function") {
        console.debug("[test] readStoreScoreSnapshot failed:", error?.message ?? error);
      }
    }
    return null;
  });

  return normalizeStoreSnapshot(rawSnapshot);
}

async function readScoreSnapshot(page, previousScores = null) {
  const domSnapshot = await readDomScoreSnapshot(page);
  if (domSnapshot) {
    return domSnapshot;
  }

  if (previousScores && typeof previousScores === "object") {
    const player = Number(previousScores.player);
    const opponent = Number(previousScores.opponent);
    if (Number.isFinite(player) && Number.isFinite(opponent)) {
      const ended =
        typeof previousScores.matchEnded === "boolean" ? previousScores.matchEnded : null;
      return { player, opponent, matchEnded: ended, domInferred: null };
    }
  }

  const storeSnapshot = await readStoreScoreSnapshot(page);
  if (storeSnapshot) {
    return storeSnapshot;
  }

  return { player: null, opponent: null, matchEnded: null, domInferred: null };
}

async function readModalVisibility(page) {
  return page.evaluate(() => {
    const modal = document.getElementById("match-end-modal");
    if (!modal) {
      return false;
    }
    const style =
      typeof window.getComputedStyle === "function" ? window.getComputedStyle(modal) : null;
    if (!style) {
      return false;
    }
    const opacity = Number(style.opacity);
    const fullyTransparent = Number.isFinite(opacity) && opacity <= 0.01;
    return (
      modal.hidden !== true &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.pointerEvents !== "none" &&
      !fullyTransparent
    );
  });
}

async function readRoundResolvingFlag(page) {
  return page.evaluate(() => {
    try {
      const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
      const round = store?.round ?? store?.currentRound ?? null;
      return round?.resolving === true;
    } catch {
      return false;
    }
  });
}

async function readEngineMatchEndState(page) {
  return page.evaluate(() => {
    try {
      const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
      const engine = store?.engine;
      if (!engine) {
        return null;
      }
      if (typeof engine.isMatchEnded === "function") {
        return engine.isMatchEnded() === true;
      }
      if (typeof engine.matchEnded === "boolean") {
        return engine.matchEnded;
      }
      if (typeof store?.matchEnded === "boolean") {
        return store.matchEnded;
      }
    } catch {}
    return null;
  });
}

async function readRoundOutcomeState(page, { previousScores = null } = {}) {
  const scoreState = await readScoreSnapshot(page, previousScores);
  const [modalVisible, roundResolving] = await Promise.all([
    readModalVisibility(page),
    readRoundResolvingFlag(page)
  ]);

  let matchEnded = false;

  if (typeof scoreState.domInferred === "boolean") {
    matchEnded = scoreState.domInferred;
  } else if (typeof scoreState.matchEnded === "boolean") {
    matchEnded = scoreState.matchEnded;
  } else if (modalVisible) {
    matchEnded = true;
  } else {
    const engineEnded = await readEngineMatchEndState(page);
    matchEnded = engineEnded === true;
  }

  const hasScores = Number.isFinite(scoreState.player) && Number.isFinite(scoreState.opponent);
  const scores = hasScores
    ? {
        player: Number(scoreState.player),
        opponent: Number(scoreState.opponent),
        matchEnded
      }
    : null;

  return { matchEnded, modalVisible, roundResolving, scores };
}

async function waitForMatchCompletion(page, timeout = 15000) {
  await expect
    .poll(
      async () => {
        const state = await readRoundOutcomeState(page);
        if (!state.matchEnded) {
          return false;
        }
        if (state.modalVisible) {
          return true;
        }
        return !state.roundResolving;
      },
      { timeout }
    )
    .toBeTruthy();
}

/**
 * @pseudocode
 * WAIT for the scoreboard to report the current totals.
 * IF either side has scored, RETURN the scores.
 * OTHERWISE reset the "next round" readiness flag and wait for the next round event.
 * CLICK the next button and choose a favourable stat for the player.
 * REPEAT until a decisive score is observed or the maximum number of rounds is exceeded.
 * THROW with diagnostics when no decisive score is produced.
 */
async function resolveMatchFromCurrentRound(page, { maxRounds = 5, nextTimeout = 5000 } = {}) {
  let lastScores = await waitForScoreDisplay(page);

  const resolveIfDecisive = (snapshot = lastScores) => {
    if (!snapshot) {
      return null;
    }
    if (snapshot.matchEnded || snapshot.player + snapshot.opponent >= 1) {
      return { player: snapshot.player, opponent: snapshot.opponent };
    }
    return null;
  };

  const initialResolution = resolveIfDecisive(lastScores);
  if (initialResolution) {
    return initialResolution;
  }

  for (let attempt = 0; attempt < maxRounds; attempt += 1) {
    const scores = await waitForScoreDisplay(page, { previousObservation: lastScores });
    if (scores) {
      lastScores = scores;
      const roundResult = resolveIfDecisive(scores);
      if (roundResult) {
        return roundResult;
      }
    } else {
      const fallbackResolution = resolveIfDecisive();
      if (fallbackResolution) {
        return fallbackResolution;
      }
    }

    await expect
      .poll(
        async () => {
          const state = await readRoundOutcomeState(page, { previousScores: lastScores });
          if (
            state.scores &&
            Number.isFinite(state.scores.player) &&
            Number.isFinite(state.scores.opponent)
          ) {
            lastScores = state.scores;
          }
          return !state.modalVisible && !state.roundResolving;
        },
        { timeout: nextTimeout }
      )
      .toBeTruthy();

    const postModalResolution = resolveIfDecisive(lastScores);
    if (postModalResolution) {
      return postModalResolution;
    }

    await page.evaluate(() => {
      if (typeof window !== "undefined") {
        window.__nextReadySeen = false;
        window.__nextReadyInit = false;
      }
    });

    const outcomeState = await readRoundOutcomeState(page, { previousScores: lastScores });
    if (outcomeState.scores) {
      lastScores = outcomeState.scores;
    }

    if (outcomeState.matchEnded) {
      return (
        resolveIfDecisive(lastScores) ?? {
          player: lastScores?.player ?? 0,
          opponent: lastScores?.opponent ?? 0
        }
      );
    }

    await waitForNextRoundReadyEvent(page, nextTimeout);
    const nextButton = page
      .locator("#next-button, [data-role='next-round'], [data-testid='next-button']")
      .first();
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    const nextReadySettled = await page.evaluate(async (limit) => {
      const waitForReady = window.__TEST_API?.state?.waitForNextButtonReady;
      if (typeof waitForReady === "function") {
        return waitForReady(limit);
      }
      return null;
    }, nextTimeout);

    const postClickResolution = resolveIfDecisive();
    if (postClickResolution) {
      return postClickResolution;
    }

    if (nextReadySettled === false) {
      throw new Error("Next round button did not become ready before timeout.");
    }

    await page.waitForSelector("#stat-buttons button[data-stat]");
    await selectAdvantagedStat(page);
  }

  const diagnostic =
    lastScores && typeof lastScores === "object"
      ? `You: ${lastScores.player}, Opponent: ${lastScores.opponent}`
      : "unknown";
  throw new Error(
    `Match did not resolve within expected rounds (attempted ${maxRounds}). Last observed scores: ${diagnostic}`
  );
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

        // Choose a stat with a deterministic advantage for the player
        await selectAdvantagedStat(page);

        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);

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
        await selectAdvantagedStat(page);

        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);

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
        await selectAdvantagedStat(page);

        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);

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
        await selectAdvantagedStat(page);

        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);
        expect(errors.length).toBe(0);

        // Verify match completed successfully
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

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

        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);

        // Verify score display is clear and readable
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toBeVisible();

        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toBeTruthy();
        expect(scoreText.length).toBeGreaterThan(5); // Should contain meaningful score info

        // Verify score display is properly formatted
        expect(scoreText).toContain(`You: ${scores.player}`);
        expect(scoreText).toContain(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);
      }, ["log", "info", "warn", "error", "debug"]));

    test("provides stable interface after match completion", async ({ page }) =>
      withMutedConsole(async () => {
        await prepareClassicBattle(page);

        await page.click("#round-select-2");
        await applyQuickWinTarget(page);
        await page.waitForSelector("#stat-buttons button[data-stat]");
        await selectAdvantagedStat(page);

        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);

        // Verify match completed
        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

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

        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);
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
        await selectAdvantagedStat(page);
        const scores = await resolveMatchFromCurrentRound(page);
        await waitForMatchCompletion(page);

        const scoreDisplay = page.locator("#score-display");
        await expect(scoreDisplay).toContainText(`You: ${scores.player}`);
        await expect(scoreDisplay).toContainText(`Opponent: ${scores.opponent}`);
        expectDecisiveFinalScore(scores);

        // Verify page remains functional after match completion
        await expect(page.locator("body")).toBeVisible();
      }, ["log", "info", "warn", "error", "debug"]));
  });
});
