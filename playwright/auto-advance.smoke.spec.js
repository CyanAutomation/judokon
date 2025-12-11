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

async function readRoundNumber(roundCounterLocator) {
  const text = await roundCounterLocator.textContent();
  const match = text?.match(/Round\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

async function readTimerSeconds(timerValueLocator) {
  const text = await timerValueLocator.textContent();
  const match = text?.match(/(\d+)s/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

test.describe("Classic Battle – auto-advance", () => {
  test("auto-advances via visible countdown", async ({ page }) => {
    expect(typeof applyDeterministicCooldown).toBe("function");

    await applyDeterministicCooldown(page, {
      cooldownMs: 1_500,
      roundTimerMs: 1,
      showRoundSelectModal: false
    });

    await startClassicBattle(page);
    await waitForBattleReady(page, { allowFallback: false });

    const roundCounter = page.getByTestId("round-counter");
    const timerValue = page.locator("#next-round-timer [data-part='value']");
    const roundMessage = page.locator("#round-message");

    await expect
      .poll(() => readRoundNumber(roundCounter), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);
    const initialRound = await readRoundNumber(roundCounter);

    const statContainer = page.getByTestId("stat-buttons");
    await expect(statContainer).toHaveAttribute("data-buttons-ready", "true");

    const firstStat = statContainer.getByRole("button").first();
    await expect(firstStat).toBeVisible();
    await firstStat.click();

    await expect
      .poll(async () => {
        const message = await roundMessage.textContent();
        return (message ?? "").trim().length > 0;
      })
      .toBe(true);

    await expect
      .poll(() => readTimerSeconds(timerValue), { timeout: 10_000 })
      .toBeGreaterThan(0);

    const cooldownBanner = (await roundMessage.textContent())?.trim();

    await expect
      .poll(() => readRoundNumber(roundCounter), { timeout: 10_000 })
      .toBeGreaterThan(initialRound);
    await expect(roundMessage).not.toHaveText(cooldownBanner ?? "");
  });
});
