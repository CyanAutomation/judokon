import { test, expect } from "./fixtures/commonSetup.js";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForSnackbar } from "./fixtures/waits.js";
import { completeRoundViaApi } from "./helpers/battleApiHelper.js";
import {
  createMatchCompletionTracker,
  getPlayerScore,
  waitForBattleReady
} from "./helpers/battleStateHelper.js";
import { parseScores } from "./helpers/scoreUtils.js";

const DETERMINISTIC_SEED = 1337;

async function openSettingsPanel(page) {
  const settings = page.locator("#cli-settings");
  await expect(settings).toBeVisible();
  const isOpen = await settings.evaluate((node) => node.open);
  if (!isOpen) {
    await settings.locator("summary").click();
    await expect(settings).toHaveJSProperty("open", true);
  }
}

const roundCounterPattern = (points) => new RegExp(`^Round \\d+ Target: ${points}$`);
const WIN_TARGET_SPEC = "Spec: CLI-WIN-TARGET-01";

async function readPlayerScore(page) {
  const apiScore = await getPlayerScore(page);
  if (Number.isFinite(apiScore)) {
    return apiScore;
  }

  const scoreDisplay = page.locator("#score-display");
  if ((await scoreDisplay.count()) > 0) {
    const datasetScore = await scoreDisplay.getAttribute("data-score-player");
    const numericDatasetScore = Number(datasetScore);
    if (Number.isFinite(numericDatasetScore)) {
      return numericDatasetScore;
    }

    const parsedScores = parseScores((await scoreDisplay.textContent()) ?? "");
    if (Number.isFinite(parsedScores.player)) {
      return parsedScores.player;
    }
  }

  return null;
}

async function selectWinTargetAndVerify(page, { key, points }) {
  const modal = page.locator("dialog.modal");
  await expect(modal).toBeVisible();

  await page.keyboard.press(key);

  await expect(modal).toBeHidden();
  await expect(page.locator("#cli-stats")).toBeVisible();

  await openSettingsPanel(page);

  const dropdown = page.locator("#points-select");
  await expect(dropdown).toHaveValue(points);

  const roundCounter = page.locator("#round-counter");
  await expect(roundCounter).toHaveText(roundCounterPattern(points));
}

async function finishMatchAtTarget(page, targetPoints) {
  await page.evaluate(() => {
    try {
      window.__TEST_API?.state?.resetBattle?.();
    } catch {}
  });

  await waitForBattleReady(page, { timeout: 15_000, allowFallback: true });

  const matchTracker = createMatchCompletionTracker(page, {
    timeout: 30_000,
    allowFallback: true
  });
  const statList = page.locator("#cli-stats");
  const snackbar = page.locator("#snackbar-container .snackbar");
  const maxRounds = Math.max(targetPoints * 3, 5);
  let finalScore = 0;

  for (let round = 0; round < maxRounds; round += 1) {
    if (matchTracker.isComplete()) {
      break;
    }

    await expect(statList).toBeVisible();
    await expect(statList).toHaveAttribute("aria-busy", "false");
    await statList.focus();
    await page.keyboard.press("1");

    await waitForSnackbar(page, "You Picked");
    await expect(snackbar).toContainText("You Picked", { timeout: 5_000 });

    const completion = await completeRoundViaApi(page, {
      options: { expireSelection: false, opponentResolveDelayMs: 0 }
    });
    expect(completion.ok, completion.reason ?? "cli.completeRound failed").toBe(true);

    const roundScore = await readPlayerScore(page);
    if (Number.isFinite(roundScore)) {
      finalScore = Math.max(finalScore, Number(roundScore));
      if (finalScore >= targetPoints) {
        break;
      }
    }
  }

  const matchResult = await matchTracker.promise;
  expect(matchResult.timedOut).toBe(false);
  const observedScore = await readPlayerScore(page);
  const scoreCandidates = [
    finalScore,
    Number.isFinite(observedScore) ? Number(observedScore) : null,
    Number.isFinite(matchResult?.scores?.player) ? matchResult.scores.player : null
  ].filter((value) => value !== null);
  const maxScore = scoreCandidates.length > 0 ? Math.max(...scoreCandidates) : finalScore;

  await expect(page.locator("#round-message")).toContainText("Match over");
  expect(maxScore).toBeGreaterThanOrEqual(targetPoints);

  return { matchResult, finalScore: maxScore };
}

test.describe("Round Selection - Win Target Synchronization", () => {
  const testCases = [
    { key: "1", points: "3", name: "Quick" },
    { key: "2", points: "5", name: "Medium" },
    { key: "3", points: "10", name: "Long" }
  ];

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((seed) => {
      try {
        localStorage.setItem("battleCLI.seed", String(seed));
      } catch {}
    }, DETERMINISTIC_SEED);

    const app = await configureApp(page, {
      testMode: "enable",
      requireRoundSelectModal: true
    });
    await page.goto("/src/pages/battleCLI.html");
    await app.applyRuntime();
    await expect(page.locator("dialog.modal")).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      try {
        localStorage.removeItem("battle.pointsToWin");
        localStorage.removeItem("battleCLI.seed");
      } catch {}
    });
  });

  for (const { key, points, name } of testCases) {
    test(`${WIN_TARGET_SPEC} - ${name} selection ends match at ${points} target`, async ({
      page
    }) => {
      await selectWinTargetAndVerify(page, { key, points });

      await finishMatchAtTarget(page, Number(points));
    });
  }

  test("Spec: CLI-WIN-TARGET-02 - persists win target selection across reload", async ({
    page
  }) => {
    await openSettingsPanel(page);

    const dropdown = page.locator("#points-select");
    await dropdown.selectOption("10");

    const confirmButton = page.locator('[data-testid="confirm-points-to-win"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    await expect(confirmButton).toBeHidden();

    await expect(page.locator("#round-counter")).toHaveText(roundCounterPattern("10"));
    await expect(dropdown).toHaveValue("10");
    const revisit = await page.context().newPage();
    try {
      await revisit.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await revisit.goto("/src/pages/battleCLI.html");
      await expect(revisit.locator("dialog.modal")).toBeVisible();
      await expect
        .poll(async () =>
          revisit.evaluate(() => {
            try {
              return localStorage.getItem("battle.pointsToWin");
            } catch {
              return null;
            }
          })
        )
        .toBe("10");
      await expect(revisit.locator("#points-select")).toHaveValue("10");

      await revisit.keyboard.press("3");
      await expect(revisit.locator("dialog.modal")).toBeHidden();
      await expect(revisit.locator("#round-counter")).toHaveText(roundCounterPattern("10"));
    } finally {
      await revisit.close();
    }
  });
});
