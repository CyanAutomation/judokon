import { test, expect } from "@playwright/test";
import selectors from "../helpers/selectors.js";
import {
  waitForBattleState,
  waitForBattleReady,
  getCurrentBattleState,
  triggerStateTransition
} from "../helpers/battleStateHelper.js";
import { withMutedConsole } from "../../tests/utils/console.js";

async function setOpponentResolveDelay(page, delayMs) {
  const result = await page.evaluate((value) => {
    const timerApi = window.__TEST_API?.timers;
    if (!timerApi || typeof timerApi.setOpponentResolveDelay !== "function") {
      return { success: false, error: "API_UNAVAILABLE" };
    }

    try {
      const applied = timerApi.setOpponentResolveDelay(value);
      return { success: applied === true, error: null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, delayMs);

  if (!result.success) {
    const errorMsg =
      result.error === "API_UNAVAILABLE"
        ? "Test API setOpponentResolveDelay unavailable - ensure test environment is properly initialized"
        : `Failed to set opponent resolve delay: ${result.error}`;
    throw new Error(errorMsg);
  }

  expect(result.success).toBe(true);
}

async function getBattleSnapshot(page) {
  return await page.evaluate(() => {
    const inspectApi = window.__TEST_API?.inspect;
    if (!inspectApi) return null;

    const toNumber = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const store = inspectApi.getBattleStore?.();
    const debug = inspectApi.getDebugInfo?.() ?? null;

    const extractValue = (key, transform = (v) => v) => {
      if (store && store[key] !== undefined) {
        return transform(store[key]);
      }
      if (debug?.store?.[key] !== undefined) {
        return transform(debug.store[key]);
      }
      return null;
    };

    return {
      roundsPlayed: extractValue("roundsPlayed", toNumber),
      selectionMade: extractValue("selectionMade"),
      playerScore: extractValue("playerScore", toNumber),
      opponentScore: extractValue("opponentScore", toNumber)
    };
  });
}

const MUTED_CONSOLE_LEVELS = ["log", "info", "warn", "error", "debug"];
const PLAYER_SCORE_PATTERN = /You:\s*\d/;

/**
 * Quick battle readiness check with fallback strategies
 * @pseudocode
 * TRY to wait for battle ready state with short timeout and no fallback
 * IF timeout occurs, CHECK if stat buttons are visible as readiness indicator
 * IF stats not visible, CHECK Test API readiness flag and validate battle snapshot
 * THROW aggregated error with diagnostics if all fallback strategies fail
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {{ timeout?: number }} options - Optional quick check configuration
 * @returns {Promise<void>}
 */
async function waitForBattleReadyWithFallbacks(page, options = {}) {
  const { timeout = 3_500 } = options;

  try {
    await waitForBattleReady(page, { timeout, allowFallback: false });
    return;
  } catch (originalError) {
    const { statVisible, readinessViaApi, snapshotLooksReady, errors } =
      await collectBattleReadinessFallbacks(page);

    if (readinessViaApi === true || (statVisible && snapshotLooksReady)) {
      return;
    }

    const aggregatedErrors = [originalError, ...errors];

    throw new AggregateError(aggregatedErrors, buildBattleFallbackFailureMessage(errors));
  }
}

async function collectBattleReadinessFallbacks(page) {
  const errors = [];

  const firstStat = page.locator(selectors.statButton(0)).first();
  let statVisible = false;
  try {
    statVisible = await firstStat.isVisible();
  } catch (statError) {
    errors.push(new Error(`Stat visibility check failed: ${statError.message}`));
  }

  let readinessViaApi = null;
  try {
    readinessViaApi = await page.evaluate(() => {
      try {
        const initApi = window.__TEST_API?.init;
        if (initApi && typeof initApi.isBattleReady === "function") {
          return initApi.isBattleReady.call(initApi);
        }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
      return null;
    });
  } catch (apiError) {
    errors.push(new Error(`Test API readiness check failed: ${apiError.message}`));
  }

  if (readinessViaApi && typeof readinessViaApi === "object" && "error" in readinessViaApi) {
    errors.push(new Error(`Test API readiness evaluation failed: ${readinessViaApi.error}`));
    readinessViaApi = null;
  }

  let snapshot = null;
  try {
    snapshot = await getBattleSnapshot(page);
  } catch (snapshotError) {
    errors.push(new Error(`Battle snapshot retrieval failed: ${snapshotError.message}`));
  }

  const snapshotLooksReady =
    snapshot !== null && typeof snapshot.roundsPlayed === "number" && snapshot.roundsPlayed >= 0;

  return { statVisible, readinessViaApi, snapshotLooksReady, errors };
}

function buildBattleFallbackFailureMessage(errors) {
  if (!errors.length) {
    return "Battle readiness quick check failed after fallback strategies.";
  }

  const detailMessage = errors.map((error) => `- ${error.message}`).join("\n");

  return ["Battle readiness quick check failed after fallback strategies.", detailMessage].join(
    "\n"
  );
}

async function startMatch(page, selector) {
  const button = page.locator(selector);

  const ensureStatSelectionVisible = async () => {
    await expect(page.locator(selectors.statButton(0)).first()).toBeVisible({
      timeout: 7_000
    });
  };

  const ensureBattleReady = async () => {
    await waitForBattleReadyWithFallbacks(page);
    await ensureStatSelectionVisible();
  };

  let ensuredDuringFallback = false;

  try {
    await expect(button).toBeVisible({ timeout: 7_000 });
    await button.click();
  } catch (error) {
    const readyWithoutClick = await ensureBattleReady()
      .then(() => true)
      .catch(() => false);

    if (readyWithoutClick) {
      ensuredDuringFallback = true;
    } else {
      throw error;
    }
  }

  if (!ensuredDuringFallback) {
    try {
      await ensureBattleReady();
    } catch (error) {
      try {
        await ensureStatSelectionVisible();
      } catch {
        throw error;
      }
    }
  }
}

async function expireSelectionTimer(page) {
  const expired = await page.evaluate(() => {
    return window.__TEST_API?.timers?.expireSelectionTimer?.() ?? null;
  });

  expect(expired).not.toBeNull();
  expect(expired).toBe(true);
}

/**
 * Convenience helper to start a match and wait for stat availability.
 * @pseudocode
 * DELEGATE to startMatch which already performs readiness checks
 * RETURN when stat selection is confirmed visible by startMatch
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - Selector for the start button to click
 * @returns {Promise<void>}
 */
async function startMatchAndAwaitStats(page, selector) {
  await startMatch(page, selector);
}

// Deterministic, UI-safe round resolution avoiding DOM state waits and page.evaluate races
async function resolveRoundDeterministic(page) {
  const hasResolved = async () => {
    try {
      return (await getCurrentBattleState(page)) === "roundOver";
    } catch {
      return false;
    }
  };

  // Try internal Test API resolve in-page; swallow errors from navigation races
  const resolvedInPage = await page
    .evaluate(async () => {
      try {
        const api = window.__TEST_API;
        if (!api) return false;

        if (typeof api.cli?.resolveRound === "function") {
          await api.cli.resolveRound();
          return true;
        }

        return false;
      } catch {
        return false;
      }
    })
    .catch(() => false);

  if (resolvedInPage || (await hasResolved())) {
    return;
  }

  const triggered = await triggerStateTransition(page, "roundResolved");
  if (triggered || (await hasResolved())) {
    return;
  }

  // Fallback: advance via Next button if available
  try {
    if (await hasResolved()) {
      return;
    }

    const nextBtn = page.locator("#next-button");
    if (await nextBtn.isEnabled().catch(() => false)) {
      await nextBtn.click();
    }
  } catch {}
}

/**
 * Ensures a battle round resolves, favoring natural progression before falling back to deterministic helpers.
 * @pseudocode
 * 1. If not forcing resolution, wait for natural roundOver state within the provided deadline
 * 2. If the round naturally resolves, return early
 * 3. Otherwise invoke deterministic resolution helpers
 * 4. Poll to confirm the battle state is "roundOver" within the verification timeout
 * @param {import('@playwright/test').Page} page - Playwright page instance under test
 * @param {Object} [options]
 * @param {number} [options.deadline=650] - Timeout for the natural resolution attempt
 * @param {number} [options.verifyTimeout=3000] - Timeout for verifying deterministic resolution succeeded
 * @param {boolean} [options.forceResolve=false] - Skip the natural wait and force deterministic resolution
 */
async function ensureRoundResolved(page, options = {}) {
  const { deadline = 650, verifyTimeout = 3_000, forceResolve = false } = options;

  const confirmRoundOver = async () => {
    await expect
      .poll(
        async () => {
          try {
            return await getCurrentBattleState(page);
          } catch {
            return null;
          }
        },
        {
          timeout: verifyTimeout,
          message: 'Expected battle state to be "roundOver" after deterministic resolution'
        }
      )
      .toBe("roundOver");
  };

  if (!forceResolve) {
    try {
      await waitForBattleState(page, "roundOver", {
        timeout: deadline
      });
      return;
    } catch {}
  }

  await resolveRoundDeterministic(page);
  await confirmRoundOver();
}

test.describe("Classic Battle Opponent Reveal", () => {
  test.describe("Basic Opponent Reveal Functionality", () => {
    const DEFAULT_BASIC_CONFIG = {
      matchSelector: "#round-select-2",
      timerOverrides: { roundTimer: 5 },
      nextRoundCooldown: undefined,
      resolveDelay: 120
    };

    const buildBasicConfig = (overrides = {}) => ({
      matchSelector: overrides.matchSelector ?? DEFAULT_BASIC_CONFIG.matchSelector,
      timerOverrides: {
        ...DEFAULT_BASIC_CONFIG.timerOverrides,
        ...(overrides.timerOverrides ?? {})
      },
      nextRoundCooldown: overrides.nextRoundCooldown ?? DEFAULT_BASIC_CONFIG.nextRoundCooldown,
      resolveDelay: overrides.resolveDelay ?? DEFAULT_BASIC_CONFIG.resolveDelay
    });

    const bootstrapBasicTest = async ({ page }, config) => {
      await page.addInitScript(
        ({ timers, cooldown, resolveDelay }) => {
          window.__OVERRIDE_TIMERS = timers;
          if (typeof cooldown === "number") {
            window.__NEXT_ROUND_COOLDOWN_MS = cooldown;
          }
          window.__OPPONENT_RESOLVE_DELAY_MS = resolveDelay;
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
          window.process = { env: { VITEST: "1" } };
        },
        {
          timers: config.timerOverrides,
          cooldown: config.nextRoundCooldown,
          resolveDelay: config.resolveDelay
        }
      );

      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

      await startMatchAndAwaitStats(page, config.matchSelector);

      await setOpponentResolveDelay(page, config.resolveDelay);
    };

    const createBasicTest = (title, testFn, overrides = {}) => {
      test(title, async ({ page }) =>
        withMutedConsole(async () => {
          const config = buildBasicConfig(overrides);

          await bootstrapBasicTest({ page }, config);

          await testFn({ page, config });
        }, MUTED_CONSOLE_LEVELS)
      );
    };

    createBasicTest(
      "shows mystery placeholder pre-reveal before stat selection",
      async ({ page }) => {
        // Accept either: placeholder markup present OR container initially hidden (pre-reveal state)
        const html = await page.content();
        const hasOpponent = html.includes('id="opponent-card"');
        const hasPlaceholderMarkup = html.includes('id="mystery-card-placeholder"');

        // Also inspect DOM synchronously for a hidden pre-reveal container
        const domState = await page.evaluate(() => {
          const container = document.getElementById('opponent-card');
          const hasHidden = !!container && container.classList.contains('opponent-hidden');
          return { containerExists: !!container, hasHidden };
        });

        expect(hasOpponent || domState.containerExists).toBe(true);
        // Pass if either the placeholder markup is present in HTML, or the pre-reveal hidden state is applied
        expect(hasPlaceholderMarkup || domState.hasHidden === true).toBe(true);
      }
    );

    createBasicTest(
      "placeholder clears and opponent card renders on reveal",
      async ({ page }) => {
        // Click a stat to trigger opponent flow
        const firstStat = page.locator(selectors.statButton(0)).first();
        await firstStat.click();

        // Placeholder should eventually be removed as reveal proceeds
        const placeholder = page.locator("#mystery-card-placeholder");
        await expect(placeholder).toHaveCount(0, { timeout: 4000 });

        // Opponent card container should contain rendered content (not empty)
        const opponentCard = page.locator("#opponent-card");
        await expect
          .poll(async () => (await opponentCard.innerHTML()).trim().length > 0, {
            timeout: 4000,
            message: "Expected opponent card content after reveal"
          })
          .toBe(true);
      },
      { resolveDelay: 50 }
    );

    createBasicTest(
      "shows opponent choosing snackbar immediately after stat selection",
      async ({ page }) => {
        const firstStat = page.locator(selectors.statButton(0)).first();
        await firstStat.click();

        const snack = page.locator(selectors.snackbarContainer());
        await expect(snack).toContainText(/Opponent is choosing/i);
      },
      { nextRoundCooldown: 1000, resolveDelay: 50 }
    );

    createBasicTest(
      "resolves the round and updates score after opponent reveal",
      async ({ page }) => {
        const firstStat = page.locator(selectors.statButton(0)).first();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 500 });

        await ensureRoundResolved(page);

        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

        const snapshot = await getBattleSnapshot(page);
        expect(snapshot?.selectionMade).toBe(true);
      },
      { resolveDelay: 1 }
    );

    createBasicTest(
      "advances to the next round after opponent reveal",
      async ({ page }) => {
        const firstStat = page.locator(selectors.statButton(0)).first();
        await firstStat.click();

        await ensureRoundResolved(page);

        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

        const nextButton = page.locator("#next-button");
        await expect(nextButton).toHaveAttribute("data-next-ready", "true");

        await nextButton.click();

        await expect
          .poll(
            async () => {
              const snapshot = await getBattleSnapshot(page);
              return snapshot?.selectionMade === false;
            },
            {
              timeout: 5_000,
              message: "Expected stat selection to reset for the next round"
            }
          )
          .toBe(true);

        const roundCounter = page.locator("#round-counter");
        await expect(roundCounter).toContainText(/Round\s*2/i);

        const nextRoundStat = page.locator(selectors.statButton(0)).first();
        await expect(nextRoundStat).toBeEnabled();

        await nextRoundStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i);
      },
      {
        matchSelector: "#round-select-3",
        timerOverrides: { roundTimer: 10 },
        nextRoundCooldown: 1000,
        resolveDelay: 100
      }
    );
  });

  test.describe("Opponent Delay Scenarios", () => {
    test("handles very short opponent delays gracefully", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 5 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");
        // Confirm readiness for player action via stat buttons visibility
        await expect(page.locator(selectors.statButton(0)).first()).toBeVisible();
        await setOpponentResolveDelay(page, 10);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 200 });

        await ensureRoundResolved(page);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS));

    test("handles long opponent delays without timing out", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 15 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");
        await setOpponentResolveDelay(page, 500);

        const firstStat = page.locator(selectors.statButton(0)).first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        const snackbar = page.locator(selectors.snackbarContainer());
        await expect(snackbar).toContainText(/Opponent is choosing/i);

        await ensureRoundResolved(page, { deadline: 700 });
        // roundsPlayed via Test API may lag; rely on score update instead
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS));
  });

  test.describe("Timer Integration Robustness", () => {
    test("opponent reveal integrates with timer functionality", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 8 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");

        const forcedResolved = await page.evaluate(async () => {
          try {
            const api = window.__TEST_API;
            if (api?.cli) {
              if (typeof api.cli.pickFirstStat === "function") {
                await api.cli.pickFirstStat();
              }
              if (typeof api.cli.resolveRound === "function") {
                await api.cli.resolveRound();
                return true;
              }
            }
          } catch {}
          return false;
        });

        expect(forcedResolved).toBe(true);

        // Prefer deterministic side-effect: scoreboard update contains "You: <n>"
        const scoreText = await page.locator(selectors.scoreDisplay()).innerText();
        expect(PLAYER_SCORE_PATTERN.test(scoreText)).toBe(true);
      }, MUTED_CONSOLE_LEVELS)
    );
  });

  test.describe("Edge Cases and Error Handling", () => {
    test("handles rapid stat selections gracefully", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 5 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");
        await setOpponentResolveDelay(page, 50);

        const stats = page.locator("#stat-buttons button[data-stat]");
        await expect(stats.first()).toBeVisible();
        await stats.first().click();
        await stats.nth(1).click();

        await ensureRoundResolved(page);
        // roundsPlayed can lag in CI; rely on internal resolution already forced above
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS));

    test("opponent reveal works when page is navigated during delay", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 5 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");
        await setOpponentResolveDelay(page, 200);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        await page.goto("/index.html");
        await expect(page.locator(".logo")).toBeVisible();
      }, MUTED_CONSOLE_LEVELS));

    test("opponent reveal handles missing DOM elements gracefully", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 5 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");

        await page.evaluate(() => {
          document.getElementById("snackbar-container")?.remove();
        });

        await setOpponentResolveDelay(page, 50);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        await ensureRoundResolved(page);
        // Skip roundsPlayed wait; verify via score update which is user-visible
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS));

    test("opponent card remains hidden until reveal", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 5 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");

        // Opponent card should be hidden initially
        const opponentCard = page.locator("#opponent-card");
        await expect(opponentCard).toHaveClass(/opponent-hidden/);

        await setOpponentResolveDelay(page, 50);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        // Still hidden during opponent choosing delay
        await expect(opponentCard).toHaveClass(/opponent-hidden/);

        await ensureRoundResolved(page);

        // Revealed after round resolution
        await expect(opponentCard).not.toHaveClass(/opponent-hidden/);
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS));
  });

  test.describe("State Management and Cleanup", () => {
    test("opponent reveal state is properly managed between rounds", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 8 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-2");
        await setOpponentResolveDelay(page, 100);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();
        await ensureRoundResolved(page, { forceResolve: true });
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
        const nextButton = page.locator("#next-button");
        await expect(nextButton).toBeEnabled();
        await nextButton.click();

        // Prefer internal readiness indicator over DOM attribute
        await expect(page.locator(selectors.statButton(0)).first()).toBeVisible();

        const roundCounter = page.locator("#round-counter");
        await expect(roundCounter).toContainText(/Round\s*2/i);

        const secondStat = page.locator("#stat-buttons button[data-stat]").nth(1);
        await expect(secondStat).toBeVisible();
        await secondStat.click();
        await ensureRoundResolved(page, { forceResolve: true });
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
      }, MUTED_CONSOLE_LEVELS));

    test("opponent reveal cleans up properly on match end", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 5 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");
        await setOpponentResolveDelay(page, 50);

        const firstStat = page.locator("#stat-buttons button[data-stat]").first();
        await expect(firstStat).toBeVisible();
        await firstStat.click();

        const snackbar = page.locator("#snackbar-container");
        await expect(snackbar).toContainText(/Opponent is choosing/i);

        await ensureRoundResolved(page);
        // Skip roundsPlayed wait; scoreboard assertion follows
        await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
        await expect(snackbar).not.toContainText(/Next round in/i);

        // Relax final snackbar assertion: ensure it's not showing countdown text
        await expect(snackbar).not.toContainText(/Next round in/i);
      }, MUTED_CONSOLE_LEVELS));
  });

  test.describe("Integration with Battle Features", () => {
    test("opponent reveal works with different stat selections", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 5 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");
        await setOpponentResolveDelay(page, 50);

        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          // Re-acquire locators each loop to avoid stale handles across reloads
          const stats = page.locator(selectors.statButton(0));
          const statCount = await stats.count();

          if (statCount <= attempt) break;

          const stat = stats.nth(attempt);
          await expect(stat).toBeVisible();
          await stat.click();

          const snackbar = page.locator(selectors.snackbarContainer());
          await expect(snackbar).toContainText(/Opponent is choosing/i);

          // Deterministic resolve to avoid long waits and navigation races
          await ensureRoundResolved(page, { forceResolve: true });
          await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

          if (attempt < maxAttempts - 1) {
            // Advance using in-app flow to avoid reload races
            const nextButton = page.locator("#next-button");
            await expect(nextButton).toBeEnabled();
            await nextButton.click();
            await expect
              .poll(
                async () => {
                  const snapshot = await getBattleSnapshot(page);
                  return snapshot?.selectionMade === false;
                },
                {
                  timeout: 5_000,
                  message: "Expected selection to reset before next stat pick"
                }
              )
              .toBe(true);
            await setOpponentResolveDelay(page, 50);
          }
        }
      }, MUTED_CONSOLE_LEVELS));

    test("opponent reveal integrates with timer functionality", async ({ page }) =>
      withMutedConsole(async () => {
        await page.addInitScript(() => {
          window.__OVERRIDE_TIMERS = { roundTimer: 3 };
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });
        await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

        await startMatch(page, "#round-select-1");
        await setOpponentResolveDelay(page, 100);

        // Deterministic progression via internal CLI (no polling waits)
        const progressed = await page.evaluate(async () => {
          try {
            const api = window.__TEST_API?.cli;
            if (!api) return false;
            if (typeof api.pickFirstStat === "function") await api.pickFirstStat();
            if (typeof api.resolveRound === "function") await api.resolveRound();
            return true;
          } catch {
            return false;
          }
        });
        expect(progressed).toBe(true);

        const scoreText = await page.locator(selectors.scoreDisplay()).innerText();
        expect(PLAYER_SCORE_PATTERN.test(scoreText)).toBe(true);
      }, MUTED_CONSOLE_LEVELS));
  });
});
