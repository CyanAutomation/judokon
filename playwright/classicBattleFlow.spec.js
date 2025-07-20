import { test, expect } from "./fixtures/commonSetup.js";
// selectors use header as the container for battle info

test.describe("Classic battle flow", () => {
  test("timer auto-selects when expired", async ({ page }) => {
    await page.addInitScript(() => {
      window.startCountdownOverride = () => {};
      const orig = window.setInterval;
      window.setInterval = (fn, ms, ...args) => orig(fn, Math.min(ms, 10), ...args);
    });
    await page.goto("/src/pages/battleJudoka.html");
    await page.waitForSelector("header #next-round-timer");
    const countdown = page.locator("header #next-round-timer");
    await expect(countdown).toHaveText(/\d+/);
    const result = page.locator("header #round-message");
    await expect(result).not.toHaveText("", { timeout: 8000 });
  });

  test("tie message appears on equal stats", async ({ page }) => {
    await page.addInitScript(() => {
      window.startCountdownOverride = () => {};
      const orig = window.setInterval;
      window.setInterval = (fn, ms, ...args) => orig(fn, Math.max(ms, 3600000), ...args);
    });
    await page.goto("/src/pages/battleJudoka.html");
    await page.waitForSelector("header #next-round-timer");
    await page.evaluate(() => {
      document.querySelector("#player-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
      document.querySelector("#computer-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
    });
    await page.locator("button[data-stat='power']").click();
    const msg = page.locator("header #round-message");
    const timer = page.locator("header #next-round-timer");
    await expect(msg).toHaveText(/Tie/);
    await expect(timer).toHaveText(/\d+/);
  });

  test("quit match confirmation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("[data-testid='home-link']").click();
    await expect(page).toHaveURL(/index.html/);
  });
});
