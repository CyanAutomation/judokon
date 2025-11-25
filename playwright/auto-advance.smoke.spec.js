// Playwright smoke test: verifies inter-round cooldown auto-advances
import { test, expect } from "./fixtures/commonSetup.js";
import {
  waitForBattleReady,
  waitForBattleState,
  waitForStatButtonsReady
} from "./helpers/battleStateHelper.js";
import { dispatchBattleEvent, readRoundsPlayed } from "./helpers/battleApiHelper.js";

const STATE_TIMEOUT_MS = 7_500;
const COUNTDOWN_TICK_TIMEOUT_MS = 8_000;

async function expectDeterministicTestApi(page) {
  const hooks = await page.evaluate(() => {
    const stateApi = window.__TEST_API?.state;
    const timersApi = window.__TEST_API?.timers;

    return {
      hasStateWait: typeof stateApi?.waitForBattleState === "function",
      hasDispatchBattleEvent: typeof stateApi?.dispatchBattleEvent === "function",
      hasCountdown: typeof timersApi?.getCountdown === "function"
    };
  });

  expect(hooks.hasStateWait, "__TEST_API.state.waitForBattleState unavailable").toBe(true);
  expect(hooks.hasDispatchBattleEvent, "Test API dispatchBattleEvent unavailable").toBe(true);
  expect(hooks.hasCountdown, "__TEST_API.timers.getCountdown unavailable").toBe(true);
}

async function assertCountdownTick(page) {
  const timerLocator = page.getByTestId("next-round-timer");
  const initialText = (await timerLocator.innerText()).trim();

  await expect(timerLocator).not.toHaveText(initialText, { timeout: COUNTDOWN_TICK_TIMEOUT_MS });

  const finalState = await page.evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null);
  expect(["cooldown", "waitingForPlayerAction"].includes(finalState)).toBe(true);
}

async function startClassicBattle(page) {
  await page.goto("/index.html");

  const startLink = page.getByRole("link", { name: "Start classic battle mode", exact: true });
  await expect(startLink).toBeVisible();

  await Promise.all([
    page.waitForURL("**/battleClassic.html"),
    startLink.click()
  ]);
}

async function readCooldownSeconds(page) {
  return await page.evaluate(() => {
    const timerEl = document.querySelector('[data-testid="next-round-timer"]');
    const timerText = timerEl?.textContent ?? "";
    const textMatch = timerText.match(/(\d+)/);
    if (textMatch) {
      const parsed = Number.parseFloat(textMatch[1]);
      if (Number.isFinite(parsed)) return parsed;
    }

    const debug = window.__TEST_API?.inspect?.getDebugInfo?.();
    const remaining = debug?.timers?.cooldown?.remaining ?? debug?.timers?.cooldownRemaining ?? null;
    if (Number.isFinite(remaining)) return Number(remaining);

    const parsedDebug = Number.parseFloat(remaining);
    if (Number.isFinite(parsedDebug)) return parsedDebug;

    const getterValue = window.__TEST_API?.timers?.getCountdown?.();
    const parsedGetter = Number.parseFloat(getterValue);
    if (Number.isFinite(parsedGetter)) return parsedGetter;

    return 0;
  });
}

async function runAutoAdvanceScenario(page, { countdownSeconds = 2, selectStat }) {
  await startClassicBattle(page);
  await waitForBattleReady(page, { allowFallback: false });
  await expectDeterministicTestApi(page);

  await waitForBattleState(page, "waitingForPlayerAction", {
    allowFallback: false,
    timeout: STATE_TIMEOUT_MS
  });

  await waitForStatButtonsReady(page, { timeout: STATE_TIMEOUT_MS });

  const roundsBefore = (await readRoundsPlayed(page)) ?? 0;

  const statContainer = page.getByTestId("stat-buttons");
  await expect(statContainer).toHaveAttribute("data-buttons-ready", "true");

  const firstStat = statContainer.getByRole("button").first();
  await expect(firstStat).toBeVisible();
  await selectStat(firstStat, statContainer);

  await waitForBattleState(page, "cooldown", { allowFallback: false, timeout: STATE_TIMEOUT_MS });
  const cooldownState = await page.evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null);
  expect(cooldownState).toBe("cooldown");

  await page.evaluate(
    ({ seconds }) => window.__TEST_API?.timers?.setCountdown?.(seconds),
    { seconds: countdownSeconds }
  );

  const cooldownCountdown = await readCooldownSeconds(page);
  expect(Number.isFinite(Number(cooldownCountdown))).toBe(true);

  await assertCountdownTick(page);

  await waitForBattleState(page, "waitingForPlayerAction", { allowFallback: false, timeout: STATE_TIMEOUT_MS });

  const roundsAfter = (await readRoundsPlayed(page)) ?? 0;
  expect(roundsAfter).toBeGreaterThanOrEqual(roundsBefore + 1);
}

test.describe("Classic Battle – auto-advance", () => {
  test("auto-advances via Test API countdown", async ({ page }) => {
    await runAutoAdvanceScenario(page, {
      countdownSeconds: 2,
      selectStat: async (firstStat) => {
        const dispatched = await dispatchBattleEvent(page, "selectStat", { index: 0 });
        if (!dispatched.ok) {
          await firstStat.click();
        }
      }
    });
  });

  test("auto-advances via UI selection path", async ({ page }) => {
    await runAutoAdvanceScenario(page, {
      countdownSeconds: 2,
      selectStat: async (firstStat) => firstStat.click()
    });
  });
});
