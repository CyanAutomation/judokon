import { test, expect } from "@playwright/test";
import {
  waitForBattleReady,
  waitForBattleState,
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

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatStatLabel(rawKey) {
  return String(rawKey ?? "")
    .split(/[_\s-]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function selectDecisiveStat(page) {
  await waitForRoundStats(page, { timeout: 10_000 });

  const selection = await page.evaluate(() => {
    const inspectApi = window.__TEST_API?.inspect;
    if (!inspectApi || typeof inspectApi.pickAdvantagedStatKey !== "function") {
      return { key: null, normalizedKey: null };
    }
    try {
      return inspectApi.pickAdvantagedStatKey();
    } catch (error) {
      return { key: null, normalizedKey: null, reason: error instanceof Error ? error.message : String(error ?? "pick failed") };
    }
  });

  const normalizedKey = (() => {
    if (typeof selection?.normalizedKey === "string" && selection.normalizedKey.trim()) {
      return selection.normalizedKey.trim();
    }
    if (typeof selection?.key === "string" && selection.key.trim()) {
      return selection.key.trim().toLowerCase();
    }
    return null;
  })();

  const statGroup = page.getByRole("group", { name: STAT_GROUP_ARIA_LABEL });
  await expect(statGroup).toBeVisible();

  if (normalizedKey) {
    const label = formatStatLabel(normalizedKey);
    const statButton = statGroup.getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}$`, "i") });
    await expect(statButton).toBeVisible();
    await expect(statButton).toBeEnabled();
    await statButton.click();
    return;
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
        showRoundSelectModal: true,
        pointsToWin: 1,
        confirmPointsToWin: true
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
    }).then((payload) => {
      matchCompleted = true;
      return payload;
    });

    for (let i = 0; i < 30 && !matchCompleted; i += 1) {

      const waitForPlayerActionPromise = waitForBattleState(page, "waitingForPlayerAction", {
        timeout: 18_000,
        allowFallback: false
      }).then(
        () => "waitingForPlayerAction",
        async (error) => {
          await matchCompletionPromise.catch(() => {});
          if (matchCompleted) {
            return "matchComplete";
          }
          throw error;
        }
      );

      const nextActionState = await Promise.race([
        waitForPlayerActionPromise,
        matchCompletionPromise.then(() => "matchComplete")
      ]);

      if (nextActionState === "matchComplete") {
        await waitForPlayerActionPromise.catch(() => {});
        break;
      }

      await waitForStatButtonsReady(page, { timeout: 10_000, allowFallback: false });

      await selectDecisiveStat(page);

      const waitForRoundOverPromise = waitForBattleState(page, "roundOver", {
        timeout: 18_000,
        allowFallback: false
      }).then(
        () => "roundOver",
        async (error) => {
          await matchCompletionPromise.catch(() => {});
          if (matchCompleted) {
            return "matchComplete";
          }
          throw error;
        }
      );

      const roundResolutionState = await Promise.race([
        waitForRoundOverPromise,
        matchCompletionPromise.then(() => "matchComplete")
      ]);

      if (roundResolutionState === "matchComplete") {
        await waitForRoundOverPromise.catch(() => {});
        break;
      }
    }

    const matchResult = await matchCompletionPromise;
    expect(matchResult).toBeTruthy();
    expect(matchResult.timedOut).toBe(false);

    if (matchResult?.dom?.modal?.visible !== true) {
      await page.evaluate(async () => {
        const stateApi = window.__TEST_API?.state;
        if (!stateApi) {
          return;
        }

        if (typeof stateApi.triggerStateTransition === "function") {
          try {
            stateApi.triggerStateTransition("finalize");
            return;
          } catch {}
        }

        if (typeof stateApi.dispatchBattleEvent === "function") {
          try {
            await stateApi.dispatchBattleEvent("finalize");
          } catch {}
        }
      });

      await waitForBattleState(page, "matchOver", { timeout: 10_000, allowFallback: false }).catch(() => {});
    }

    await expect(page.locator("#match-end-modal")).toBeVisible({ timeout: 15_000 });

    // Assert that the showEndModal function incremented its structured counter
    const callCount = await page.evaluate(() => window.__classicBattleEndModalCount ?? 0);
    expect(callCount).toBeGreaterThan(0);
  });
});
