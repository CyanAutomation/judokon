import { test, expect } from "../fixtures/commonSetup.js";
import { withMutedConsole } from "../../tests/utils/console.js";
import { applyDeterministicCooldown } from "../helpers/cooldownFixtures.js";
import {
  waitForBattleReady,
  waitForBattleState,
  waitForTestApi
} from "../helpers/battleStateHelper.js";

// Validate that players can skip the inter-round cooldown using the visible UI control.
test.describe("Classic Battle cooldown skip via UI", () => {
  test("Next/Skip control bypasses countdown and unlocks the next round", async ({ page }) => {
    await withMutedConsole(async () => {
      await applyDeterministicCooldown(page, {
        cooldownMs: 5000,
        roundTimerMs: 1000
      });

      await page.goto("/src/pages/battleClassic.html");
      await waitForTestApi(page);

      await page.getByRole("button", { name: "Medium" }).click();
      await waitForBattleReady(page, { allowFallback: false });

      const statButton = page.getByTestId("stat-button").first();
      await statButton.click();

      // Accept any valid post-selection state (handles skipRoundCooldown flag if set)
      // Note: This test explicitly sets cooldownMs: 5000, so cooldown should occur
      await waitForBattleState(page, ["cooldown", "roundStart", "waitingForPlayerAction"], {
        allowFallback: false
      });

      const snackbar = page.locator("#snackbar-container .snackbar-bottom");
      await expect(snackbar).toBeVisible();
      const timerValue = page.locator("#next-round-timer [data-part='value']");

      await expect
        .poll(async () => (await timerValue.textContent())?.trim(), { timeout: 10_000 })
        .not.toBe("0s");
      const initialCountdown = (await timerValue.textContent())?.trim() ?? "";

      const nextButton = page.getByTestId("next-button");
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");

      const skipControl = page.getByRole("button", { name: /skip/i }).first();
      const controlToUse = (await skipControl.count()) > 0 ? skipControl : nextButton;

      // controlToUse is guaranteed to be either skipControl or nextButton from line 44
      await controlToUse.click();

      await waitForBattleState(page, "waitingForPlayerAction", { allowFallback: false });
      await expect(snackbar).toBeVisible();
      await expect(timerValue).not.toHaveText(initialCountdown);
      await expect(nextButton).not.toHaveAttribute("data-next-ready", "true");
      await expect(statButton).toBeEnabled();
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
