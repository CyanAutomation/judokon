import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";
import { completeRoundViaApi } from "./helpers/battleApiHelper.js";
import { configureApp } from "./fixtures/appConfig.js";

const CLASSIC_BATTLE_URL = "/src/pages/battleClassic.html";
const WAIT_TIMEOUT = 7_500;
const MATCH_COMPLETION_MAX_ROUNDS = 10;

async function launchQuickClassicBattle(page) {
  await page.addInitScript(() => {
    window.__FF_OVERRIDES = {
      ...(window.__FF_OVERRIDES || {}),
      showRoundSelectModal: true,
      skipRoundCooldown: false
    };
  });

  await page.goto(CLASSIC_BATTLE_URL);

  const quickBattleButton = page.getByRole("button", { name: "Quick" });
  await expect(quickBattleButton).toBeVisible();
  await quickBattleButton.click();

  await waitForBattleReady(page, { timeout: 10_000 });
}

test.describe("Classic Battle – API helpers", () => {
  test("completeRoundViaApi reports success when state advances to cooldown", async ({ page }) => {
    await launchQuickClassicBattle(page);
    await waitForBattleState(page, "waitingForPlayerAction", { timeout: WAIT_TIMEOUT });

    const firstStatButton = page.getByTestId("stat-button").first();
    await expect(firstStatButton).toBeVisible();
    await firstStatButton.click();

    await waitForBattleState(page, "roundDecision", { timeout: WAIT_TIMEOUT });

    const completion = await completeRoundViaApi(page, {
      options: { expireSelection: false }
    });

    expect(completion.ok).toBe(true);
    expect(completion.finalState).toBe("cooldown");
  });

  test("completeRoundViaApi reports success when match ends on resolution", async ({ page }) => {
    const app = await configureApp(page, {
      battle: { pointsToWin: 1 }
    });

    await launchQuickClassicBattle(page);

    try {
      await app.applyRuntime();
      const matchEndStates = new Set(["matchDecision", "matchOver"]);
      let completion = null;

      // Loop up to MATCH_COMPLETION_MAX_ROUNDS rounds; pointsToWin=1 ends after the
      // first decisive result, but draws may require additional attempts.
      for (let roundIndex = 0; roundIndex < MATCH_COMPLETION_MAX_ROUNDS; roundIndex += 1) {
        await waitForBattleState(page, "waitingForPlayerAction", { timeout: WAIT_TIMEOUT });

        const firstStatButton = page.getByTestId("stat-button").first();
        await expect(firstStatButton).toBeVisible();
        await firstStatButton.click();

        completion = await completeRoundViaApi(page, {
          options: { expireSelection: false }
        });

        expect(completion.ok).toBe(true);

        if (matchEndStates.has(completion.finalState)) {
          break;
        }

        await waitForBattleState(page, "waitingForPlayerAction", { timeout: WAIT_TIMEOUT });
      }

      expect(completion).not.toBeNull();
      expect(matchEndStates.has(completion.finalState)).toBe(true);
    } finally {
      await app.cleanup();
    }
  });
});
