import { test, expect } from "@playwright/test";
import selectors from "../helpers/selectors.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import {
  MUTED_CONSOLE_LEVELS,
  PLAYER_SCORE_PATTERN,
  ensureRoundResolved,
  initializeBattle
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
      const firstStat = page.locator(selectors.statButton(0)).first();
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
    "shows opponent choosing snackbar immediately after stat selection",
    async ({ page }) => {
      const firstStat = page.locator(selectors.statButton(0)).first();
      await firstStat.click();

      const snack = page.locator(selectors.snackbarContainer());
      await expect(snack).toContainText(/Opponent is choosing/i);
    },
    { nextRoundCooldown: 1_000, resolveDelay: 50 }
  );

  runMessageTest(
    "opponent card remains hidden until reveal",
    async ({ page }) => {
      const opponentCard = page.locator("#opponent-card");
      await expect(opponentCard).toHaveClass(/opponent-hidden/);

      const firstStat = page.locator(selectors.statButton(0)).first();
      await firstStat.click();

      await expect(opponentCard).toHaveClass(/opponent-hidden/);

      await ensureRoundResolved(page);

      await expect(opponentCard).not.toHaveClass(/opponent-hidden/);
      await expect(page.locator(selectors.scoreDisplay())).toContainText(PLAYER_SCORE_PATTERN);
    },
    { resolveDelay: 50 }
  );
});
