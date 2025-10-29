import { test, expect } from "@playwright/test";
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
  test(title, async ({ page }) =>
    withMutedConsole(async () => {
      const config = buildMessageConfig(overrides);

      await initializeBattle(page, {
        matchSelector: config.matchSelector,
        timerOverrides: config.timerOverrides,
        nextRoundCooldown: config.nextRoundCooldown,
        resolveDelay: config.resolveDelay
      });

      await testFn({ page, config });
    }, MUTED_CONSOLE_LEVELS)
  );
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

async function getDispatchedEvents(page) {
  return await page.evaluate(() => window.__TEST_API?.__dispatchedEvents ?? []);
}

test.describe("Classic Battle Opponent Messages", () => {
  runMessageTest("shows mystery placeholder pre-reveal before stat selection", async ({ page }) => {
    const domState = await page.evaluate(() => {
      const container = document.getElementById("opponent-card");
      const placeholder = document.getElementById("mystery-card-placeholder");
      const hasHidden = !!container && container.classList.contains("opponent-hidden");
      return {
        containerExists: Boolean(container),
        hasHidden,
        hasPlaceholder: Boolean(placeholder)
      };
    });

    expect(domState.containerExists).toBe(true);
    expect(domState.hasPlaceholder || domState.hasHidden === true).toBe(true);
  });

  runMessageTest(
    "placeholder clears and opponent card renders on reveal",
    async ({ page }) => {
      const firstStat = page.locator(selectors.statButton()).first();
      await firstStat.click();

      const placeholder = page.locator("#mystery-card-placeholder");
      await expect(placeholder).toHaveCount(0, { timeout: 4_000 });

      const opponentCard = page.locator("#opponent-card");
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
      await setOpponentResolveDelay(page, 1_200);
      const firstStat = page.locator(selectors.statButton()).first();
      await firstStat.click();

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
        .poll(
          async () => await opponentCard.getAttribute("aria-label"),
          { timeout: 4_000 }
        )
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
            .poll(
              async () => await opponentCard.getAttribute("aria-label"),
              { timeout: 4_000 }
            )
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

        const dispatchedEvents = await getDispatchedEvents(page);
        expect(dispatchedEvents).toContain("roundResolved");
      } finally {
        await cleanupStalledCliFallback(page);
      }
    },
    { resolveDelay: 50 }
  );
});
