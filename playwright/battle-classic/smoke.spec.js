import { test, expect } from "@playwright/test";
import {
  waitForBattleReady,
  waitForBattleState,
  configureClassicBattle,
  createMatchCompletionTracker,
  waitForRoundStats,
  waitForStatButtonsReady,
  waitForNextButtonReady,
  setPointsToWin
} from "../helpers/battleStateHelper.js";

const showLogsInBrowser = typeof process !== "undefined" && process?.env?.SHOW_TEST_LOGS === "true";

// Benign message patterns to filter out during debug logging
const BENIGN_MESSAGE_PATTERNS = {
  noisyResource404: /Failed to load resource: the server responded with a status of 404/i,
  benignCountryMapping: /countryCodeMapping\.json/i,
  benignNavFallback: /Failed to fetch (navigation items|game modes), falling back to import/i
};

const STAT_GROUP_ARIA_LABEL = /choose a stat/i;

async function waitForStateOrMatch(page, state, matchTracker, options) {
  const statePromise = waitForBattleState(page, state, options);

  try {
    const result = await Promise.race([
      statePromise.then(() => "state"),
      matchTracker.promise.then(() => "matchComplete")
    ]);

    if (result === "matchComplete") {
      await statePromise.catch(() => {});
    }

    return result;
  } catch (error) {
    if (matchTracker.isComplete() && !matchTracker.hasError()) {
      return "matchComplete";
    }
    throw error;
  }
}

async function selectDecisiveStat(page) {
  await waitForRoundStats(page, { timeout: 10_000 });

  const matchModal = page.locator("#match-end-modal");
  if (await matchModal.isVisible()) {
    return;
  }

  const statGroup = page.getByRole("group", { name: STAT_GROUP_ARIA_LABEL });
  await statGroup.waitFor({ state: "visible" });
  const statButtons = statGroup.locator("[data-testid='stat-button']");
  const buttonCount = await statButtons.count();

  for (let index = 0; index < buttonCount; index += 1) {
    const candidate = statButtons.nth(index);
    if (await candidate.isEnabled()) {
      await candidate.click();
      return;
    }
  }

  const fallbackButton = statGroup.getByRole("button").first();
  await fallbackButton.click();
}

test.describe("Classic Battle page", () => {
  test("plays a full match and shows the end modal", async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        showRoundSelectModal: true
      };
    });

    if (showLogsInBrowser) {
      page.on("console", (message) => {
        const type = message.type();
        if (type !== "warning" && type !== "error") return;

        const text = message.text();
        const isNoisyResource404 = BENIGN_MESSAGE_PATTERNS.noisyResource404.test(text);
        const isBenignCountryMapping = BENIGN_MESSAGE_PATTERNS.benignCountryMapping.test(text);
        const isBenignNavFallback = BENIGN_MESSAGE_PATTERNS.benignNavFallback.test(text);
        if (isNoisyResource404 || isBenignCountryMapping || isBenignNavFallback) {
          return;
        }

        const log = type === "error" ? console.error : console.warn;
        log(`[browser:${type}]`, text);
      });
    }

    await page.goto("/src/pages/battleClassic.html");

    await configureClassicBattle(
      page,
      {
        roundTimerMs: 0,
        cooldownMs: 0,
        enableTestMode: true,
        showRoundSelectModal: true
      },
      { timeout: 10_000 }
    );

    // 1. Click the round select button for a quick match
    await page.locator('button:has-text("Quick")').click();

    await waitForBattleReady(page, { allowFallback: false });
    await setPointsToWin(page, 1, { timeout: 10_000 });

    const matchTracker = createMatchCompletionTracker(page, {
      timeout: 28_000,
      allowFallback: true
    });

    for (let i = 0; i < 30 && !matchTracker.isComplete(); i += 1) {
      const nextActionState = await waitForStateOrMatch(
        page,
        "waitingForPlayerAction",
        matchTracker,
        { timeout: 18_000, allowFallback: false }
      );

      if (nextActionState === "matchComplete") {
        break;
      }

      await waitForStatButtonsReady(page, { timeout: 10_000 });

      await selectDecisiveStat(page);

      const roundResolutionState = await waitForStateOrMatch(page, "roundOver", matchTracker, {
        timeout: 18_000,
        allowFallback: false
      });

      if (roundResolutionState === "matchComplete") {
        try {
          // Don't click next if match modal has appeared (another race condition)
          const matchModal = page.locator("#match-end-modal");
          if (!(await matchModal.isVisible())) {
            await waitForNextButtonReady(page, { timeout: 10_000 });
            await page.getByTestId("next-button").click();
          }
        } catch (error) {
          if (!matchTracker.hasError()) {
            throw error;
          }
        }
        break;
      }

      // Check if match modal has appeared before clicking next button (race condition fix)
      const matchModalCheck = page.locator("#match-end-modal");
      if (await matchModalCheck.isVisible()) {
        break;
      }

      await waitForNextButtonReady(page, { timeout: 10_000 });

      await page.getByTestId("next-button").click();
    }

    const matchResult = await matchTracker.promise;
    expect(matchResult).toBeTruthy();
    expect(matchResult.timedOut).toBe(false);

    // The match completion tracker (with fallback) resolves when the modal exists in the DOM.
    // The modal should now be visible, but use locator() which waits for element presence.
    const modal = page.locator("#match-end-modal");
    await expect(modal).toBeAttached({ timeout: 5_000 });
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Assert that the showEndModal function incremented its structured counter
    const callCount = await page.evaluate(() => window.__classicBattleEndModalCount ?? 0);
    expect(callCount).toBeGreaterThan(0);
  });
});
