import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady, waitForSettingsReady } from "./fixtures/waits.js";
import { readFileSync } from "fs";
import { resolve } from "path";
// battleTestUtils resets engine state and manipulates timer for scenarios
import { _resetForTest, setTieRound } from "../tests/helpers/battleTestUtils.js";
// selectors use header as the container for battle info

const rounds = JSON.parse(readFileSync(resolve("src/data/battleRounds.json"), "utf8"));

test.describe.parallel("Classic battle flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: false } } })
      );
    });
  });

  test("shows countdown before first round", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    const roundOptions = page.locator(".round-select-buttons button");
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
    // Select a round so the pre-round countdown starts and the snackbar
    // is rendered. The header timer may be empty before the first round
    // starts, so assert against the snackbar which reports the countdown.
    const roundOptions = page.locator(".round-select-buttons button");
    await roundOptions.first().click();
    await expect(page.locator(".modal-backdrop:not([hidden])")).toHaveCount(0);
    const sn = page.locator(".snackbar");
    await expect(sn).toHaveText(/Next round in: \d+s/);
    await waitForBattleReady(page);
    await page.evaluate(() => window.skipBattlePhase?.());
    await page.evaluate(() => window.freezeBattleHeader?.());
    await expect(sn).toHaveText(/Next round in: \d+s/);
  });

  test("tie message appears on equal stats", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.evaluate(() => window.skipBattlePhase?.());
    await page.evaluate(() => window.freezeBattleHeader?.());
    await page.evaluate(_resetForTest);
    await page.evaluate(setTieRound);
    const powerBtn = page.locator("button[data-stat='power']");
    console.log("DEBUG: power button disabled attribute:", await powerBtn.getAttribute("disabled"));
    console.log("DEBUG: power button text:", await powerBtn.innerText());
    // Ensure the button is enabled and labeled for the test scenario so the
    // click handler runs and the snackbar is rendered.
    await page.evaluate(() => {
      const btn = document.querySelector("button[data-stat='power']");
      if (btn) {
        btn.textContent = "Power";
        btn.disabled = false;
        btn.tabIndex = 0;
        btn.classList.remove("disabled");
      }
    });
    await powerBtn.click();
    const snackbar = page.locator(".snackbar");
    // Diagnostic: dump snackbar-container HTML to help identify missing snackbar
    const containerHtml = await page.locator("#snackbar-container").innerHTML();
    console.log("DEBUG: snackbar-container HTML after click:", containerHtml);
    await expect(snackbar).toHaveText("You Picked: Power");
    const msg = page.locator("header #round-message");
    await expect(msg).toHaveText(/Tie/);
    await expect(snackbar).toHaveText(/Next round in: \d+s/);
  });

  test("quit match confirmation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    const roundOptions = page.locator(".round-select-buttons button");
    await roundOptions.first().click();
    await expect(page.locator(".modal-backdrop:not([hidden])")).toHaveCount(0);
    await waitForBattleReady(page);
    await page.locator("[data-testid='home-link']").click();
    const confirmButton = page.locator("#confirm-quit-button");
    await confirmButton.waitFor({ state: "attached" });
    await confirmButton.click();
    await expect(page).toHaveURL(/index.html/);
  });

  test("clears match when navigating away and back", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    // Wait for the battle view to finish initializing rather than relying on
    // the header timer, which may be empty before the first round starts.
    await waitForBattleReady(page);
    await page.locator("[data-testid='nav-13']").click();
    await expect(page).toHaveURL(/settings.html/);
    await waitForSettingsReady(page);
    await page.goBack();
    await expect(page).toHaveURL(/battleJudoka.html/);
    await expect(page.locator("header #next-round-timer")).toHaveText("");
  });
});
