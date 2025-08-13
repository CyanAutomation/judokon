import { test, expect } from "./fixtures/commonSetup.js";
// selectors use header as the container for battle info

test.describe.parallel("Classic battle flow", () => {
  test("timer auto-selects when expired", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    const countdown = page.locator("header #next-round-timer");
    await countdown.waitFor();
    await expect(countdown).toHaveText(/\d+/);
    await page.evaluate(() => window.skipBattlePhase?.());
    await page.evaluate(() => window.freezeBattleHeader?.());
    const result = page.locator("header #round-message");
    await expect(result).not.toHaveText("", { timeout: 15000 });
    const snackbar = page.locator(".snackbar");
    await expect(snackbar).toHaveText(/Next round in: \d+s/, { timeout: 15000 });
  });

  test("tie message appears on equal stats", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.evaluate(() => window.skipBattlePhase?.());
    await page.evaluate(() => window.freezeBattleHeader?.());
    const timer = page.locator("header #next-round-timer");
    await timer.waitFor();
    await page.evaluate(async () => {
      const { _resetForTest } = await import(
        new URL("/src/helpers/classicBattle.js", window.location.href)
      );
      _resetForTest(window.battleStore);
      document.querySelector("#next-round-timer").textContent = "Time Left: 3s";
      document.querySelector("#player-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
      document.querySelector("#computer-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
    });
    await page.locator("button[data-stat='power']").click();
    const snackbar = page.locator(".snackbar");
    await expect(snackbar).toHaveText("You Picked: Power");
    const msg = page.locator("header #round-message");
    await expect(msg).toHaveText(/Tie/);
    await expect(snackbar).toHaveText(/Next round in: \d+s/, { timeout: 15000 });
  });

  test("quit match confirmation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.waitForFunction(() => window.homeLinkReady);
    await page.locator("[data-testid='home-link']").click();
    const confirmButton = page.locator("#confirm-quit-button");
    await confirmButton.waitFor({ state: "attached" });
    await confirmButton.click();
    await expect(page).toHaveURL(/index.html/);
  });
});
