import { test, expect } from "./fixtures/commonSetup.js";
import { readFileSync } from "fs";
import { resolve } from "path";
// selectors use header as the container for battle info

const rounds = JSON.parse(readFileSync(resolve("src/data/battleRounds.json"), "utf8"));

test.describe.parallel("Classic battle flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: false } } })
      );
    });
  });

  test("shows countdown before first round", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    const roundOptions = page.locator(".round-select-buttons button");
    await roundOptions.first().waitFor();
    await expect(roundOptions).toHaveText(rounds.map((r) => r.label));
    await roundOptions.first().click();
    await expect(page.locator(".modal-backdrop:not([hidden])")).toHaveCount(0);
    const snackbar = page.locator(".snackbar");
    await expect(snackbar).toHaveText(/Next round in: \d+s/);
    await page.evaluate(() => window.freezeBattleHeader?.());
    const playerCard = page.locator("#player-card");
    await expect(playerCard).toBeEmpty();
  });

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
      document.querySelector("#opponent-card").innerHTML =
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

  test("clears match when navigating away and back", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    const timer = page.locator("header #next-round-timer");
    await timer.waitFor();
    await page.locator("[data-testid='nav-13']").click();
    await expect(page).toHaveURL(/settings.html/);
    await page.goBack();
    await expect(page).toHaveURL(/battleJudoka.html/);
    await page.waitForFunction(() => window.__classicBattleState === "matchOver");
    await expect(page.locator("header #next-round-timer")).toHaveText("");
  });
});
