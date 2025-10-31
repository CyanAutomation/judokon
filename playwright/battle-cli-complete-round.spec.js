import { test, expect } from "@playwright/test";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";
import { completeRoundViaApi } from "./helpers/battleApiHelper.js";

const CLASSIC_BATTLE_URL = "/src/pages/battleClassic.html";
const WAIT_TIMEOUT = 7_500;

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
    await launchQuickClassicBattle(page);
    const matchEndStates = new Set(["matchDecision", "matchOver"]);
    let completion = null;

    for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
      await waitForBattleState(page, "waitingForPlayerAction", { timeout: WAIT_TIMEOUT });

      const firstStatButton = page.getByTestId("stat-button").first();
      await expect(firstStatButton).toBeVisible();
      await firstStatButton.click();

      completion = await completeRoundViaApi(page, {
        outcomeEvent: "outcome=winPlayer",
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
  });
});
