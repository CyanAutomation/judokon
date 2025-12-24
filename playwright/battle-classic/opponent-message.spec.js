import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../helpers/selectors.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import {
  MUTED_CONSOLE_LEVELS,
  PLAYER_SCORE_PATTERN,
  confirmRoundResolved,
  ensureRoundResolved,
  initializeBattle,
  setOpponentResolveDelay
} from "./support/opponentRevealTestSupport.js";

const DEFAULT_MESSAGE_CONFIG = {
  matchSelector: "#round-select-2",
  timerOverrides: { roundTimer: 5 },
  nextRoundCooldown: undefined,
  resolveDelay: 120
};

const buildMessageConfig = (overrides = {}) => ({
  matchSelector: overrides.matchSelector ?? DEFAULT_MESSAGE_CONFIG.matchSelector,
  timerOverrides: {
    ...DEFAULT_MESSAGE_CONFIG.timerOverrides,
    ...(overrides.timerOverrides ?? {})
  },
  nextRoundCooldown: overrides.nextRoundCooldown ?? DEFAULT_MESSAGE_CONFIG.nextRoundCooldown,
  resolveDelay: overrides.resolveDelay ?? DEFAULT_MESSAGE_CONFIG.resolveDelay
});

const runMessageTest = (title, testFn, overrides = {}) => {
  // Special handling for the snackbar test - skip console muting for debugging
  const skipMuting = title.includes("shows opponent feedback snackbar");

  test(title, async ({ page }) => {
    const testBody = async () => {
      const config = buildMessageConfig(overrides);

      await initializeBattle(page, {
        matchSelector: config.matchSelector,
        timerOverrides: config.timerOverrides,
        nextRoundCooldown: config.nextRoundCooldown,
        resolveDelay: config.resolveDelay
      });

      await testFn({ page, config });
    };

    if (skipMuting) {
      await testBody();
    } else {
      await withMutedConsole(testBody, MUTED_CONSOLE_LEVELS);
    }
  });
};

const STALLED_CLI_RESOLVE_RESULT = Object.freeze({
  detail: {},
  dispatched: false,
  emitted: false
});

async function setupStalledCliFallback(page) {
  await page.evaluate((stalledResult) => {
    const api = window.__TEST_API;
    if (!api?.cli?.resolveRound || !api?.state?.dispatchBattleEvent) {
      throw new Error("Test API unavailable for CLI override");
    }

    const originalResolveRound = api.cli.resolveRound.bind(api.cli);
    const originalDispatch = api.state.dispatchBattleEvent.bind(api.state);

    api.__originalResolveRound = originalResolveRound;
    api.__originalDispatch = originalDispatch;
    api.__dispatchedEvents = [];

    api.cli.resolveRound = async (...args) => {
      const state = api.state.getBattleState?.() ?? null;
      if (state === "waitingForPlayerAction") {
        return stalledResult;
      }

      return originalResolveRound(...args);
    };

    api.state.dispatchBattleEvent = async (eventName, payload) => {
      api.__dispatchedEvents.push(eventName);
      return originalDispatch(eventName, payload);
    };
  }, STALLED_CLI_RESOLVE_RESULT);
}

async function cleanupStalledCliFallback(page) {
  await page.evaluate(() => {
    const api = window.__TEST_API;
    if (api?.__originalResolveRound) {
      api.cli.resolveRound = api.__originalResolveRound;
      delete api.__originalResolveRound;
    }
    if (api?.__originalDispatch) {
      api.state.dispatchBattleEvent = api.__originalDispatch;
      delete api.__originalDispatch;
    }
    if (api) {
      delete api.__dispatchedEvents;
    }
  });
}

async function withBattleEventCapture(page, eventNames, callback) {
  await page.evaluate((names) => {
    if (typeof window.emitBattleEvent === "function") {
      window.emitBattleEvent("capture.init");
    }
    const target = globalThis.__classicBattleEventTarget || null;
    const trackedEvents = [];
    const namesToCapture =
      Array.isArray(names) && names.length > 0
        ? names.filter(Boolean)
        : ["opponentReveal", "roundResolved"];
    const handler = (event) => {
      if (namesToCapture.includes(event.type)) {
        trackedEvents.push(event.type);
      }
    };
    if (target) {
      namesToCapture.forEach((name) => target.addEventListener(name, handler));
    }
    window.__capturedBattleEvents = trackedEvents;
    window.__releaseBattleEventCapture = () => {
      if (target) {
        namesToCapture.forEach((name) => target.removeEventListener(name, handler));
      }
      delete window.__releaseBattleEventCapture;
    };
  }, eventNames);

  try {
    return await callback({
      getEvents: async () =>
        await page.evaluate(() => Array.from(window.__capturedBattleEvents ?? []))
    });
  } finally {
    await page.evaluate(() => {
      window.__releaseBattleEventCapture?.();
      delete window.__capturedBattleEvents;
    });
  }
}

test.describe("Classic Battle Opponent Messages", () => {
  runMessageTest("shows mystery placeholder pre-reveal before stat selection", async ({ page }) => {
    const opponentCard = page.locator("#opponent-card");
    await expect(opponentCard).toHaveCount(1);

    const placeholder = opponentCard.locator("#mystery-card-placeholder");
    await expect(placeholder).toHaveCount(1);

    const hasHiddenClass = await opponentCard.evaluate((node) =>
      node.classList.contains("opponent-hidden")
    );
    expect(hasHiddenClass).toBe(false);
  });

  runMessageTest(
    "placeholder clears and opponent card renders on reveal",
    async ({ page }) => {
      const firstStat = page.locator(selectors.statButton()).first();
      await firstStat.click();

      const opponentCard = page.locator("#opponent-card");

      const placeholder = opponentCard.locator("#mystery-card-placeholder");
      await expect(placeholder).toHaveCount(0, { timeout: 4_000 });

      await expect
        .poll(
          async () =>
            !(await opponentCard.evaluate((node) => node.classList.contains("opponent-hidden"))),
          { timeout: 4_000, message: "Expected opponent card to lose hidden class after reveal" }
        )
        .toBe(true);

      await expect
        .poll(async () => (await opponentCard.innerHTML()).trim().length > 0, {
          timeout: 4_000,
          message: "Expected opponent card content after reveal"
        })
        .toBe(true);
    },
    { resolveDelay: 50 }
  );

  runMessageTest(
    "shows opponent feedback snackbar immediately after stat selection",
    async ({ page }) => {
      // Inject logging into the page to track what's happening
      await page.addInitScript(() => {
        // Track selectStat calls
        window.__selectStatCalled = false;
        window.__selectStatArgs = null;

        // Track showSnackbar calls
        window.__snackbarCalls = [];

        // Track event emissions
        window.__battleEventsEmitted = [];
        
        // Wrap showSnackbar EARLY (before battle init)
        const originalSetup = () => {
          if (window.showSnackbar && !window.__snackbarWrapped) {
            window.__snackbarWrapped = true;
            const originalShowSnackbar = window.showSnackbar;
            window.showSnackbar = function (...args) {
              window.__snackbarCalls.push({
                message: args[0],
                timestamp: Date.now()
              });
              return originalShowSnackbar.apply(this, args);
            };
          }
          
          // Also try to listen to events early
          const target = window.__classicBattleEventTarget || globalThis.__classicBattleEventTarget;
          if (target && !window.__eventListenerAttached) {
            window.__eventListenerAttached = true;
            target.addEventListener("statSelected", (e) => {
              window.__battleEventsEmitted.push({
                type: "statSelected",
                detail: e.detail,
                timestamp: Date.now()
              });
            });
          }
        };
        
        // Try to set up immediately
        originalSetup();
        
        // Also try after DOM ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', originalSetup);
        }
        
        // And keep trying periodically for a bit
        let attempts = 0;
        const interval = setInterval(() => {
          originalSetup();
          attempts++;
          if (attempts > 20) clearInterval(interval);
        }, 50);
      });

      await setOpponentResolveDelay(page, 1_200);

      const firstStat = page.locator(selectors.statButton()).first();

      // Log state before click
      const beforeClick = await page.evaluate(() => {
        const buttons = document.querySelectorAll("#stat-buttons button[data-stat]");
        const firstButton = buttons[0];
        return {
          snackbarText: document.getElementById("snackbar-container")?.textContent || "",
          snackbarChildren: document.getElementById("snackbar-container")?.children?.length || 0,
          buttonCount: buttons.length,
          firstButtonDisabled: firstButton?.disabled,
          firstButtonDataStat: firstButton?.dataset?.stat,
          hasClickHandler:
            firstButton?.onclick !== null ||
            firstButton?.parentElement?.__classicBattleStatHandler !== undefined
        };
      });
      console.log("[TEST] Before click:", beforeClick);

      await firstStat.click();
      
      // Immediately check if button became disabled
      const rightAfterClick = await page.evaluate(() => {
        const buttons = document.querySelectorAll("#stat-buttons button[data-stat]");
        const firstButton = buttons[0];
        return {
          firstButtonDisabled: firstButton?.disabled,
          bodyDataStatSelected: document.body?.dataset?.statSelected
        };
      });
      console.log("[TEST] Right after click:", rightAfterClick);

      // Wait a bit for events to process
      await page.waitForTimeout(300);

      // Check what happened
      const afterClick = await page.evaluate(() => {
        // Debug: check if our wrapper is still in place
        const snackbarFnString = window.showSnackbar ? window.showSnackbar.toString() : 'undefined';
        const hasOurWrapper = snackbarFnString.includes('__snackbarCalls');
        
        return {
          selectStatCalled: window.__selectStatCalled,
          selectStatArgs: window.__selectStatArgs,
          snackbarCalls: window.__snackbarCalls,
          battleEvents: window.__battleEventsEmitted,
          snackbarText: document.getElementById("snackbar-container")?.textContent || "",
          snackbarHTML: document.getElementById("snackbar-container")?.innerHTML || "",
          featureFlag: window.__FF_OVERRIDES?.opponentDelayMessage,
          hasOurWrapper,
          showSnackbarExists: typeof window.showSnackbar === 'function'
        };
      });

      console.log("[TEST] After click:", JSON.stringify(afterClick, null, 2));
      console.log("[TEST] Snackbar calls:", afterClick.snackbarCalls?.length || 0);
      console.log("[TEST] Battle events:", afterClick.battleEvents?.length || 0);
      console.log("[TEST] Current snackbar text:", afterClick.snackbarText);

      if (afterClick.snackbarCalls && afterClick.snackbarCalls.length > 0) {
        console.log("[TEST] Snackbar was called with:", afterClick.snackbarCalls);
      } else {
        console.log("[TEST] WARNING: showSnackbar was never called after click!");
      }

      if (afterClick.battleEvents && afterClick.battleEvents.length > 0) {
        console.log("[TEST] Battle events emitted:", afterClick.battleEvents);
      } else {
        console.log("[TEST] WARNING: No statSelected events were emitted!");
      }

      const snack = page.locator(selectors.snackbarContainer());
      await expect(snack).toContainText(/Opponent is choosing|Next round in/i);
    },
    { nextRoundCooldown: 2_000, resolveDelay: 500 }
  );

  runMessageTest(
    "opponent card remains hidden until reveal",
    async ({ page }) => {
      const opponentCard = page.locator("#opponent-card");
      const mysteryPlaceholder = opponentCard.locator("#mystery-card-placeholder");
      await expect(opponentCard).toHaveAttribute("aria-label", "Mystery opponent card");
      await expect(mysteryPlaceholder).toHaveCount(1);

      const firstStat = page.locator(selectors.statButton()).first();
      await firstStat.click();

      await expect(opponentCard).toHaveAttribute("aria-label", "Mystery opponent card");
      await expect(mysteryPlaceholder).toHaveCount(1);

      await ensureRoundResolved(page);

      await expect
        .poll(async () => await opponentCard.getAttribute("aria-label"), { timeout: 4_000 })
        .toBe("Opponent card");
      await expect(mysteryPlaceholder).toHaveCount(0);
      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
    },
    { resolveDelay: 50, nextRoundCooldown: 2_000 }
  );

  runMessageTest(
    "CLI resolveRound reveals the opponent card",
    async ({ page }) => {
      await withBattleEventCapture(
        page,
        ["opponentReveal", "roundResolved"],
        async ({ getEvents }) => {
          const firstStat = page.locator(selectors.statButton()).first();
          await firstStat.click();

          const opponentCard = page.locator("#opponent-card");
          const mysteryPlaceholder = opponentCard.locator("#mystery-card-placeholder");
          await expect(opponentCard).toHaveAttribute("aria-label", "Mystery opponent card");
          await expect(mysteryPlaceholder).toHaveCount(1);

          await page.evaluate(async () => {
            const api = window.__TEST_API;
            if (!api?.cli?.resolveRound) {
              throw new Error("CLI resolveRound unavailable for test");
            }
            await api.cli.resolveRound();
          });

          await expect
            .poll(async () => await opponentCard.getAttribute("aria-label"), { timeout: 4_000 })
            .toBe("Opponent card");
          await expect(mysteryPlaceholder).toHaveCount(0);
          await confirmRoundResolved(page, {
            timeout: 3_000,
            message: 'Expected battle state to be "roundOver" after CLI resolveRound'
          });
          await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);

          const capturedEvents = await getEvents();
          expect(capturedEvents).toContain("opponentReveal");

          const opponentRevealIndex = capturedEvents.indexOf("opponentReveal");
          const roundResolvedIndex = capturedEvents.lastIndexOf("roundResolved");
          expect(opponentRevealIndex).toBeLessThan(
            roundResolvedIndex,
            `Expected opponentReveal (index ${opponentRevealIndex}) to occur before roundResolved (index ${roundResolvedIndex}). Events: ${capturedEvents.join(", ")}`
          );
        }
      );
    },
    { resolveDelay: 50, nextRoundCooldown: 2_000 }
  );

  runMessageTest(
    "forces round resolution when CLI resolveRound stalls in waitingForPlayerAction",
    async ({ page }) => {
      await setupStalledCliFallback(page);

      try {
        await withBattleEventCapture(page, ["roundResolved"], async ({ getEvents }) => {
          const firstStat = page.locator(selectors.statButton()).first();
          await firstStat.click();

          await ensureRoundResolved(page, { forceResolve: true });

          try {
            await confirmRoundResolved(page, {
              timeout: 3_000,
              message: 'Expected battle state to resolve to "roundOver" after forced fallback'
            });
          } catch (error) {
            let lastObservedBattleState = null;
            try {
              lastObservedBattleState = await page.evaluate(
                () => window.__TEST_API?.state?.getBattleState?.() ?? null
              );
            } catch {}
            error.message = `${error.message}\nLast observed battle state: ${
              lastObservedBattleState ?? "null"
            }`;
            throw error;
          }

          const emittedEvents = await getEvents();
          expect(emittedEvents).toContain("roundResolved");
        });
      } finally {
        await cleanupStalledCliFallback(page);
      }
    },
    { resolveDelay: 50 }
  );
});
