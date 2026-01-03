import { test, expect } from "../fixtures/commonSetup.js";
import {
  waitForBattleReady,
  configureClassicBattle,
  waitForMatchCompletion,
  waitForRoundStats,
  waitForStatButtonsReady,
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

async function configureDeterministicBattle(page) {
  await page.addInitScript(() => {
    window.__FF_OVERRIDES = {
      showRoundSelectModal: true
    };
    window.__OVERRIDE_TIMERS = {
      roundTimer: 1,
      resolveDelay: 0
    };
  });
}

async function logBrowserWarnings(page) {
  if (!showLogsInBrowser) return;
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

async function startClassicBattle(page) {
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

  await page.locator('button:has-text("Quick")').click();
  await waitForBattleReady(page, { allowFallback: false, timeout: 12_000 });
}

async function selectFirstEnabledStat(page) {
  await waitForRoundStats(page, { timeout: 10_000 });
  await waitForStatButtonsReady(page, { timeout: 10_000 });

  const statGroup = page.getByRole("group", { name: STAT_GROUP_ARIA_LABEL });
  await statGroup.waitFor({ state: "visible" });

  const statButtons = statGroup.locator("[data-testid='stat-button']");
  const firstEnabled = statButtons.locator(":not([disabled])").first();
  await expect(firstEnabled).toBeVisible({ timeout: 5000 });
  await firstEnabled.click({ timeout: 1000 });
}

test.describe("Classic Battle page", () => {
  test("match ends and modal appears", async ({ page }) => {
    await configureDeterministicBattle(page);
    await logBrowserWarnings(page);
    await startClassicBattle(page);
    await setPointsToWin(page, 1, { timeout: 10_000 });

    await selectFirstEnabledStat(page);

    const matchResult = await waitForMatchCompletion(page, {
      timeout: 10_000,
      allowFallback: false
    });

    expect(matchResult).toBeTruthy();
    expect(matchResult.timedOut).toBe(false);

    // Detailed end-modal + round-flow coverage is handled in dedicated specs.
    const matchEndModal = page.locator("#match-end-modal").first();
    await expect(matchEndModal).toBeVisible();

    const matchEndTitle = page.locator("#match-end-title").first();
    await expect(matchEndTitle).toHaveText("Match Over");

    const scoreDisplay = page.locator("#score-display");
    await expect(scoreDisplay).toContainText(/You:\s*\d+/i);
    await expect(scoreDisplay).toContainText(/Opponent:\s*\d+/i);

    const nextButton = page.getByTestId("next-button");
    await expect(nextButton).toBeDisabled();
  });
});
