import { test, expect } from "./fixtures/commonSetup.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";
import { dispatchBattleEvent } from "./helpers/battleApiHelper.js";
import { applyDeterministicCooldown } from "./helpers/cooldownFixtures.js";

const BATTLE_PAGE_URL = "/src/pages/battleClassic.html";
const PLAYER_ACTION_STATE = "waitingForPlayerAction";
const COUNTDOWN_PATTERN = /\btime left:\s*\d+(\.\d+)?s\b/i;

async function navigateToBattle(page, options = {}) {
  const {
    cooldownMs = 1200,
    roundTimerMs = 16,
    featureFlagOverrides = { enableTestMode: true, showRoundSelectModal: true }
  } = options;

  await applyDeterministicCooldown(page, {
    cooldownMs,
    roundTimerMs,
    showRoundSelectModal: true
  });

  if (featureFlagOverrides && Object.keys(featureFlagOverrides).length > 0) {
    await page.addInitScript((overrides) => {
      window.__FF_OVERRIDES = {
        ...(window.__FF_OVERRIDES || {}),
        ...overrides
      };
    }, featureFlagOverrides);
  }

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
    const firstStatButton = page.getByTestId("stat-button").first();
    await expect(firstStatButton).toBeDisabled({ timeout: 10000 });

    const timerMessage = page.getByRole("status").filter({ hasText: /time left:/i });
    await expect(timerMessage).toContainText(COUNTDOWN_PATTERN);

    await expect(page.locator("body")).toHaveAttribute("data-battle-state", "cooldown");

    // Wait for cooldown to complete and state to transition back
    await expect(page.locator("body")).toHaveAttribute("data-battle-state", PLAYER_ACTION_STATE);
    await expect(page.getByTestId("stat-buttons")).toHaveAttribute("data-buttons-ready", "true");
    await expect(firstStatButton).toBeEnabled();
  });

  test("interrupt during cooldown keeps countdown visible and resumes", async ({ page }) => {
    await launchClassicBattle(page, { cooldownMs: 1500, roundTimerMs: 8 });

    await page.getByTestId("stat-button").first().click();

    await expect(page.locator("body")).toHaveAttribute("data-battle-state", "cooldown");
    const timerMessage = page.getByRole("status").filter({ hasText: /time left:/i });
    await expect(timerMessage).toContainText(COUNTDOWN_PATTERN);

    const interruptResult = await dispatchBattleEvent(page, "interrupt", {
      reason: "cooldown coverage"
    });
    expect(interruptResult.ok).toBe(true);

    await expect(timerMessage).toContainText(COUNTDOWN_PATTERN);

    // Wait for cooldown to complete and state to transition back
    await expect(page.locator("body")).toHaveAttribute("data-battle-state", PLAYER_ACTION_STATE);
    const roundText = await page.getByTestId("round-counter").innerText();
    const roundNumber = Number.parseInt(roundText.replace(/\D+/g, ""), 10);
    expect(roundNumber).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId("stat-buttons")).toHaveAttribute("data-buttons-ready", "true");
    await expect(page.getByTestId("stat-button").first()).toBeEnabled();
  });

  test("enabling test mode via settings keeps countdown cues during interrupts", async ({ page }) => {
    await page.goto("/src/pages/settings.html");

    const advancedSummary = page.locator('details[data-section-id="advanced"] summary');
    await advancedSummary.click();

    const testModeToggle = page.locator("#feature-enable-test-mode");
    await expect(testModeToggle).toBeVisible();
    if (!(await testModeToggle.isChecked())) {
      await testModeToggle.click();
    }
    await expect(testModeToggle).toBeChecked();

    await launchClassicBattle(page, {
      cooldownMs: 1200,
      roundTimerMs: 8,
      featureFlagOverrides: { showRoundSelectModal: true }
    });

    const battleArea = page.locator("#battle-area");
    await expect(battleArea).toHaveAttribute("data-test-mode", "true");
    await expect(page.getByTestId("test-mode-banner")).toContainText(/test mode active/i);

    const interruptResult = await dispatchBattleEvent(page, "interrupt", {
      reason: "settings enabled test mode"
    });
    expect(interruptResult.ok).toBe(true);

    const timerMessage = page.getByRole("status").filter({ hasText: /time left:/i });
    await expect(timerMessage).toContainText(COUNTDOWN_PATTERN);

    const firstStatButton = page.getByTestId("stat-button").first();
    await expect(firstStatButton).toBeDisabled({ timeout: 10000 });

    await expect(page.locator("body")).toHaveAttribute("data-battle-state", PLAYER_ACTION_STATE);
    await expect(firstStatButton).toBeEnabled();
  });
});
