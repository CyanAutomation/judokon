import { test, expect } from "@playwright/test";
import { waitForBattleReady, waitForBattleState } from "./helpers/battleStateHelper.js";
import { completeRoundViaApi } from "./helpers/battleApiHelper.js";

const CLASSIC_BATTLE_URL = "/src/pages/battleClassic.html";

test.describe("Classic Battle – API helpers", () => {
  test("completeRoundViaApi reports success when state advances to cooldown", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        ...(window.__FF_OVERRIDES || {}),
        showRoundSelectModal: true,
        skipRoundCooldown: false
      };
    });

    await page.goto(CLASSIC_BATTLE_URL);

    await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
    await page.getByRole("button", { name: "Quick" }).click();

    await waitForBattleReady(page, { timeout: 10_000 });
    await waitForBattleState(page, "waitingForPlayerAction", { timeout: 7_500 });

    await page.evaluate(() => {
      window.__TEST_API?.engine?.setPointsToWin?.(5);
    });

    const firstStatButton = page.getByTestId("stat-button").first();
    await expect(firstStatButton).toBeVisible();
    await firstStatButton.click();

    await waitForBattleState(page, "roundDecision", { timeout: 7_500 });

    const completion = await completeRoundViaApi(page, {
      options: { expireSelection: false }
    });

    expect(completion.ok).toBe(true);
    expect(completion.finalState).toBe("cooldown");
  });
});
