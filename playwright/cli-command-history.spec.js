import { test, expect } from "./fixtures/battleCliFixture.js";
import {
  waitForTestApi,
  waitForBattleState,
  getBattleStateWithErrorHandling
} from "./helpers/battleStateHelper.js";
import { completeRoundViaApi, dispatchBattleEvent } from "./helpers/battleApiHelper.js";

const BATTLE_READY_TIMEOUT_MS = 10_000;
const ROUND_TRANSITION_TIMEOUT_MS = 7_500;

test.describe("CLI Command History", () => {
  test("completeRound without explicit outcome waits for cooldown", async ({ page }) => {
    // This mirrors the CLI auto-round behaviour where the state machine must reach cooldown
    // without an explicit outcome event, relying on automatic timers to finish the round.
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState("domcontentloaded");

    await waitForTestApi(page);

    const battleReady = await page.evaluate(async (timeout) => {
      const initApi = window.__TEST_API?.init ?? null;
      const waitForBattleReady = initApi?.waitForBattleReady;
      if (typeof waitForBattleReady !== "function") {
        return {
          ok: false,
          reason: "init.waitForBattleReady unavailable on Test API"
        };
      }

      try {
        const ready = await waitForBattleReady.call(initApi, timeout);
        return {
          ok: ready === true,
          reason: ready === true ? null : "waitForBattleReady returned false"
        };
      } catch (error) {
        return {
          ok: false,
          reason: error?.message ?? "waitForBattleReady threw"
        };
      }
    }, BATTLE_READY_TIMEOUT_MS);

    expect(
      battleReady.ok,
      battleReady.reason ?? "Test API waitForBattleReady should report battle readiness"
    ).toBe(true);

    const currentStateResult = await getBattleStateWithErrorHandling(page);

    expect(
      currentStateResult.ok,
      currentStateResult.reason ?? "Unable to resolve battle state via Test API"
    ).toBe(true);

    const { state: currentState } = currentStateResult;

    if (currentState === "waitingForMatchStart" || currentState === "matchStart") {
      const startClicked = await dispatchBattleEvent(page, "startClicked");
      expect(
        startClicked.ok,
        startClicked.reason ??
          `Failed to dispatch startClicked (result: ${startClicked.result ?? "unknown"})`
      ).toBe(true);

      // Accept cooldown OR any subsequent state (handles skipRoundCooldown flag)
      await waitForBattleState(page, ["cooldown", "roundStart", "waitingForPlayerAction"], {
        timeout: BATTLE_READY_TIMEOUT_MS,
        allowFallback: false
      });
    }

    const afterStartStateResult = await getBattleStateWithErrorHandling(page);

    expect(
      afterStartStateResult.ok,
      afterStartStateResult.reason ?? "Unable to resolve battle state after startClicked"
    ).toBe(true);

    if (afterStartStateResult.state !== "waitingForPlayerAction") {
      const readyForRound = await dispatchBattleEvent(page, "ready");
      expect(
        readyForRound.ok,
        readyForRound.reason ??
          `Failed to dispatch ready (result: ${readyForRound.result ?? "unknown"})`
      ).toBe(true);
    }

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    await page.keyboard.press("1");

    await waitForBattleState(page, "roundDecision", {
      timeout: ROUND_TRANSITION_TIMEOUT_MS,
      allowFallback: false
    });

    const completion = await page.evaluate(async () => {
      const cliApi = window.__TEST_API?.cli;
      if (!cliApi || typeof cliApi.completeRound !== "function") {
        return {
          ok: false,
          finalState: null,
          reason: "cli.completeRound unavailable"
        };
      }

      try {
        const result = await cliApi.completeRound(
          {},
          { outcomeEvent: null, expireSelection: false }
        );
        return {
          ok: true,
          finalState: result?.finalState ?? null,
          reason: null
        };
      } catch (error) {
        return {
          ok: false,
          finalState: null,
          reason: error?.message ?? "completeRound threw"
        };
      }
    });

    expect(
      completion.ok,
      completion.reason ?? "cli.completeRound without outcome should resolve"
    ).toBe(true);
    expect(["cooldown", "roundStart", "waitingForPlayerAction"]).toContain(completion.finalState);

    // Accept cooldown OR any subsequent state (handles skipRoundCooldown flag)
    await waitForBattleState(page, ["cooldown", "roundStart", "waitingForPlayerAction"], {
      timeout: ROUND_TRANSITION_TIMEOUT_MS,
      allowFallback: false
    });
  });

  test("should show stat selection history", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState("domcontentloaded");

    // Clear any previous history
    await page.evaluate(() => localStorage.removeItem("cliStatHistory"));

    await waitForTestApi(page);

    // Setup battle
    const battleReady = await page.evaluate(async (timeout) => {
      const initApi = window.__TEST_API?.init ?? null;
      const waitForBattleReady = initApi?.waitForBattleReady;
      if (typeof waitForBattleReady !== "function") {
        return { ok: false, reason: "init.waitForBattleReady unavailable" };
      }
      try {
        const ready = await waitForBattleReady.call(initApi, timeout);
        return {
          ok: ready === true,
          reason: ready === true ? null : "waitForBattleReady returned false"
        };
      } catch (error) {
        return { ok: false, reason: error?.message ?? "waitForBattleReady threw" };
      }
    }, BATTLE_READY_TIMEOUT_MS);

    expect(battleReady.ok, battleReady.reason).toBe(true);

    const currentState = await getBattleStateWithErrorHandling(page);
    expect(currentState.ok).toBe(true);

    if (currentState.state === "waitingForMatchStart" || currentState.state === "matchStart") {
      const startClicked = await dispatchBattleEvent(page, "startClicked");
      expect(startClicked.ok, startClicked.reason).toBe(true);

      // Accept cooldown OR any subsequent state (handles skipRoundCooldown flag)
      await waitForBattleState(page, ["cooldown", "roundStart", "waitingForPlayerAction"], {
        timeout: BATTLE_READY_TIMEOUT_MS,
        allowFallback: false
      });
    }

    const afterStart = await getBattleStateWithErrorHandling(page);
    expect(afterStart.ok).toBe(true);

    if (afterStart.state !== "waitingForPlayerAction") {
      const readyForRound = await dispatchBattleEvent(page, "ready");
      expect(readyForRound.ok, readyForRound.reason).toBe(true);
    }

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    // Round 1: Select stat '1' and complete
    await page.keyboard.press("1");
    await page.evaluate(() => Promise.resolve()); // Wait for microtask to execute selectStat
    const res1 = await completeRoundViaApi(page);
    expect(res1.ok, res1.reason).toBe(true);

    // Ready for next round
    const ready1 = await dispatchBattleEvent(page, "ready");
    expect(ready1.ok, ready1.reason).toBe(true);

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    // Round 2: Select stat '2' via keyboard and complete the round to persist history naturally
    await page.keyboard.press("2");
    await page.evaluate(() => Promise.resolve()); // Wait for microtask to execute selectStat
    const res2 = await completeRoundViaApi(page);
    expect(res2.ok, res2.reason).toBe(true);

    const ready2 = await dispatchBattleEvent(page, "ready");
    expect(ready2.ok, ready2.reason).toBe(true);

    await waitForBattleState(page, "waitingForPlayerAction", {
      timeout: BATTLE_READY_TIMEOUT_MS,
      allowFallback: false
    });

    // Move focus away from stat list to enable history navigation
    // (In real usage, user would tab away or click elsewhere first)
    await page.evaluate(() => document.body.focus());

    const snackbar = page.locator("#snackbar-container .snackbar");
    const statList = page.locator("#cli-stats");
    const statRows = page.locator("#cli-stats .cli-stat");
    const statOptions = await statRows.evaluateAll((rows) =>
      rows
        .map((row) => row.dataset.stat?.trim())
        .filter((value) => value && value.length > 0)
        .filter((value) => value.length > 0)
    );
    expect(statOptions.length).toBeGreaterThanOrEqual(2);

    const [firstStat, secondStat] = statOptions;

    if (!firstStat || !secondStat) {
      throw new Error(
        `Expected at least 2 stats, got ${statOptions.length}: ${JSON.stringify(statOptions)}`
      );
    }

    await expect(statRows.first()).toHaveAttribute("data-stat", firstStat);
    await expect(statRows.nth(1)).toHaveAttribute("data-stat", secondStat);

    // History navigation should surface the most recent selections
    await page.keyboard.press("ArrowUp");
    await expect(snackbar).toContainText(`History: ${secondStat}`);
    await expect(statList).toHaveAttribute("data-history-preview", secondStat);
    await expect(
      statList.locator(`.history-preview[data-stat="${secondStat}"]`)
    ).toBeVisible();

    await page.keyboard.press("ArrowUp");
    await expect(snackbar).toContainText(`History: ${firstStat}`);
    await expect(statList).toHaveAttribute("data-history-preview", firstStat);
    await expect(statList.locator(`.history-preview[data-stat="${firstStat}"]`)).toBeVisible();

    // Navigating forward should clear the preview and return focus to the current prompt
    await page.keyboard.press("ArrowDown");
    await expect(snackbar).toContainText(`History: ${secondStat}`);
    await expect(statList).toHaveAttribute("data-history-preview", secondStat);
    await page.keyboard.press("ArrowDown");
    await expect(snackbar).toHaveText("");
    await expect(statList).not.toHaveAttribute("data-history-preview");
  });
});
