// Contract: this smoke test must prove the inter-round cooldown countdown is visible
// and that the battle auto-advances to the next round without any manual input.
import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady } from "./helpers/battleStateHelper.js";
import { applyDeterministicCooldown } from "./helpers/cooldownFixtures.js";

async function startClassicBattle(page) {
  await page.goto("/index.html");

  const startLink = page.getByRole("link", { name: "Start classic battle mode", exact: true });
  await expect(startLink).toBeVisible();

  await Promise.all([page.waitForURL("**/battleClassic.html"), startLink.click()]);
}

test.describe("Classic Battle – auto-advance", () => {
  test.beforeAll(() => {
    expect(typeof applyDeterministicCooldown).toBe("function");
  });

  test("auto-advances via visible countdown", async ({ page }) => {
    await applyDeterministicCooldown(page, {
      cooldownMs: 1_500,
      roundTimerMs: 1,
      showRoundSelectModal: false
    });

    await startClassicBattle(page);
    await waitForBattleReady(page, { allowFallback: false });

    const roundCounter = page.getByTestId("round-counter");
    const nextRoundTimer = page.getByTestId("next-round-timer");
    const timerValue = page.locator("#next-round-timer [data-part='value']");
    const roundMessage = page.locator("#round-message");

    await expect(roundCounter).toContainText(/Round\s*1/i);

    const statContainer = page.getByTestId("stat-buttons");
    await expect(statContainer).toHaveAttribute("data-buttons-ready", "true");

    const firstStat = statContainer.getByRole("button").first();
    await expect(firstStat).toBeVisible();
    await firstStat.click();

    await expect(roundMessage).toBeVisible();
    await expect(roundMessage).toContainText(/picked/i);

    await expect(nextRoundTimer).toBeVisible();
    await expect(timerValue).toHaveText(/\d+s/);

    // Wait for auto-advance to complete before checking Round 2
    await expect(roundCounter).toContainText(/Round\s*2/i, { timeout: 10_000 });
  });
});
