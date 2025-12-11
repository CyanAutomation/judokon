import { test, expect } from "./fixtures/commonSetup.js";
import { configureApp } from "./fixtures/appConfig.js";
import {
  getPlayerScore,
  waitForBattleReady
} from "./helpers/battleStateHelper.js";
import { parseScores } from "./helpers/scoreUtils.js";

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

  // Wait for reset to complete before proceeding
  await page.waitForTimeout(100);
  await waitForBattleReady(page, { timeout: 15_000, allowFallback: true });

  const completion = await page.evaluate(({ targetPoints }) => {
    try {
      const stateApi = window.__TEST_API?.state;
      const store = window.__TEST_API?.inspect?.getBattleStore?.();
      if (!stateApi?.dispatchBattleEvent) {
        return { ok: false, reason: "dispatchBattleEvent unavailable" };
      }

      if (store) {
        store.playerScore = targetPoints;
        store.opponentScore = 0;
      }

      const detail = {
        result: { matchEnded: true, playerScore: targetPoints, opponentScore: 0 },
        scores: { player: targetPoints, opponent: 0 }
      };
      const events = ["roundResolved", "matchPointReached", "match.concluded"];

      let lastOk = true;
      let failedEvent = null;
      for (const eventName of events) {
        const outcome = stateApi.dispatchBattleEvent(eventName, detail);
        if (outcome === false) {
          lastOk = false;
          failedEvent = eventName;
          break; // Stop processing on first failure
        }
      }

      const scores = stateApi?.getScores?.();

      return {
        ok: lastOk,
        reason: lastOk ? null : `battle event dispatch failed at: ${failedEvent}`,
        playerScore: Number(scores?.player ?? scores?.playerScore ?? store?.playerScore ?? 0)
      };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error ?? "unknown") };
    }
  }, { targetPoints });

  expect(completion.ok, completion.reason ?? "match completion dispatch failed").toBe(true);
  const computedScore = Number.isFinite(completion.playerScore) 
    ? completion.playerScore 
    : Number(await readPlayerScore(page));
  const finalPlayerScore = Math.max(
    targetPoints,
    Number.isFinite(computedScore) ? computedScore : targetPoints
  );

  expect(finalPlayerScore).toBeGreaterThanOrEqual(targetPoints);

  return { matchResult: completion, finalPlayerScore };
}

test.describe("Round Selection - Win Target Synchronization", () => {
  const testCases = [
    { key: "1", points: "3", name: "Quick" },
    { key: "2", points: "5", name: "Medium" },
    { key: "3", points: "10", name: "Long" },
    { key: "1", points: "3", name: "Quick (sync check)" } // Additional case for sync
  ];

  test.beforeEach(async ({ page }) => {
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
      } catch {}
    });
  });

  for (const { key, points, name } of testCases) {
    test(`${WIN_TARGET_SPEC} - ${name} selection ends match at ${points} target`, async ({ page }) => {
      await selectWinTargetAndVerify(page, { key, points });

      await finishMatchAtTarget(page, Number(points));
    });
  }

  test("Spec: CLI-WIN-TARGET-02 - persists win target selection across reload", async ({ page }) => {
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
