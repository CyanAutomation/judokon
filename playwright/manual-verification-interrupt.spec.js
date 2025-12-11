import { test, expect } from "./fixtures/commonSetup.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";
import { dispatchBattleEvent } from "./helpers/battleApiHelper.js";
import { applyDeterministicCooldown } from "./helpers/cooldownFixtures.js";

const BATTLE_PAGE_URL = "/src/pages/battleClassic.html";
const PLAYER_ACTION_STATE = "waitingForPlayerAction";

async function navigateToBattle(page, options = {}) {
  const { cooldownMs = 1200, roundTimerMs = 16 } = options;

  await applyDeterministicCooldown(page, {
    cooldownMs,
    roundTimerMs,
    showRoundSelectModal: true
  });

  await page.addInitScript(() => {
    window.__FF_OVERRIDES = {
      ...(window.__FF_OVERRIDES || {}),
      enableTestMode: true,
      showRoundSelectModal: true
    };
  });

  await page.goto(BATTLE_PAGE_URL);
  await waitForTestApi(page);
}

async function launchClassicBattle(page, options = {}) {
  await navigateToBattle(page, options);

  const quickButton = page.getByRole("button", { name: "Quick" });
  await expect(quickButton).toBeVisible();
  await quickButton.click();

  await expect(page.getByTestId("stat-buttons")).toHaveAttribute("data-buttons-ready", "true");
}

test.describe("Classic battle interrupt recovery", () => {
  test("interrupt transitions to cooldown and resumes with visible countdown cues", async ({
    page
  }) => {
    await launchClassicBattle(page, { cooldownMs: 1200, roundTimerMs: 8 });

    const interruptResult = await dispatchBattleEvent(page, "interrupt", {
      reason: "interrupt for countdown coverage"
    });
    expect(interruptResult.ok).toBe(true);

    await expect(page.locator("body")).toHaveAttribute("data-battle-state", "cooldown");
    await expect(page.getByTestId("stat-button").first()).toBeDisabled();

    const timerMessage = page
      .getByRole("status")
      .filter({ hasText: /time left:/i });
    await expect(timerMessage).toBeVisible();

    await expect(page.locator("body")).toHaveAttribute("data-battle-state", "cooldown");

    // Wait for cooldown to complete and state to transition back
    await expect(page.locator("body")).toHaveAttribute("data-battle-state", PLAYER_ACTION_STATE);
    await expect(page.getByTestId("stat-buttons")).toHaveAttribute("data-buttons-ready", "true");
    await expect(page.getByTestId("stat-button").first()).toBeEnabled();
  });

  test("interrupt during cooldown keeps countdown visible and resumes", async ({ page }) => {
    await launchClassicBattle(page, { cooldownMs: 1000, roundTimerMs: 8 });

    await page.getByTestId("stat-button").first().click();

    await expect(page.locator("body")).toHaveAttribute("data-battle-state", "cooldown");
    const timerMessage = page
      .getByRole("status")
      .filter({ hasText: /time left:/i });
    await expect(timerMessage).toBeVisible();

    const interruptResult = await dispatchBattleEvent(page, "interrupt", {
      reason: "cooldown coverage"
    });
    expect(interruptResult.ok).toBe(true);

    await expect(timerMessage).toBeVisible();

    // Wait for cooldown to complete and state to transition back
    await expect(page.locator("body")).toHaveAttribute("data-battle-state", PLAYER_ACTION_STATE);
    const roundText = await page.getByTestId("round-counter").innerText();
    const roundNumber = Number.parseInt(roundText.replace(/\D+/g, ""), 10);
    expect(roundNumber).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId("stat-buttons")).toHaveAttribute("data-buttons-ready", "true");
    await expect(page.getByTestId("stat-button").first()).toBeEnabled();
  });

});

test.describe("Classic battle debug surface", () => {
  test("should expose debug state when available", async ({ page }) => {
    await navigateToBattle(page);

    const diagnostics = await page.evaluate(() => {
      const api = window.__TEST_API ?? null;
      return {
        hasStateApi: typeof api?.state === "object", // core bridge
        hasInitHelper: typeof api?.init?.waitForBattleReady === "function",
        hasDispatch: typeof api?.state?.dispatchBattleEvent === "function",
        hasStateGetter: typeof api?.state?.getBattleState === "function"
      };
    });

    expect(diagnostics.hasStateApi).toBe(true);
    expect(diagnostics.hasInitHelper).toBe(true);
    expect(diagnostics.hasDispatch).toBe(true);
    expect(diagnostics.hasStateGetter).toBe(true);
  });
});
