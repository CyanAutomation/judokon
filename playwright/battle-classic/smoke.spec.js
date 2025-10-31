import { test, expect } from "@playwright/test";
import {
  waitForBattleReady,
  waitForBattleState,
  configureClassicBattle,
  waitForMatchCompletion,
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

async function waitForStateOrMatch(page, state, matchCompletionPromise, options, isMatchComplete) {
  const statePromise = waitForBattleState(page, state, options);

  try {
    const result = await Promise.race([
      statePromise.then(() => "state"),
      matchCompletionPromise.then(() => "matchComplete")
    ]);

    if (result === "matchComplete") {
      await statePromise.catch(() => {});
    }

    return result;
  } catch (error) {
    await matchCompletionPromise.catch(() => {});
    if (typeof isMatchComplete === "function" && isMatchComplete()) {
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
  await expect(statGroup).toBeVisible();

  const statButtons = statGroup.locator("[data-testid='stat-button']");
  const buttonCount = await statButtons.count();

  for (let index = 0; index < buttonCount; index += 1) {
    const candidate = statButtons.nth(index);
    await expect(candidate).toBeVisible();
    if (await candidate.isEnabled()) {
      await candidate.click();
      return;
    }
  }

  const fallbackButton = statGroup.getByRole("button").first();
  await expect(fallbackButton).toBeVisible();
  await expect(fallbackButton).toBeEnabled();
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

    let matchCompleted = false;
    const matchCompletionPromise = waitForMatchCompletion(page, {
      timeout: 28_000,
      allowFallback: false
    })
      .then((payload) => {
        matchCompleted = true;
        return payload;
      })
      .catch((error) => {
        matchCompleted = true;
        throw error;
      });

    for (let i = 0; i < 30 && !matchCompleted; i += 1) {
      const nextActionState = await waitForStateOrMatch(
        page,
        "waitingForPlayerAction",
        matchCompletionPromise,
        { timeout: 18_000, allowFallback: false },
        () => matchCompleted
      );

      if (nextActionState === "matchComplete") {
        break;
      }

      await waitForStatButtonsReady(page, { timeout: 10_000, allowFallback: false });

      await selectDecisiveStat(page);

      const roundResolutionState = await waitForStateOrMatch(
        page,
        "roundOver",
        matchCompletionPromise,
        { timeout: 18_000, allowFallback: false },
        () => matchCompleted
      );

      if (roundResolutionState === "matchComplete") {
        break;
      }

      await waitForNextButtonReady(page, { timeout: 10_000 });

      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toBeEnabled();
      await nextButton.click();
    }

    const matchResult = await matchCompletionPromise;
    expect(matchResult).toBeTruthy();
    expect(matchResult.timedOut).toBe(false);

    await expect(page.locator("#match-end-modal")).toBeVisible({ timeout: 15_000 });

    // Assert that the showEndModal function incremented its structured counter
    const callCount = await page.evaluate(() => window.__classicBattleEndModalCount ?? 0);
    expect(callCount).toBeGreaterThan(0);
  });
});
