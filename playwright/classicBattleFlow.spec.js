import { test, expect } from "@playwright/test";
import { registerCommonRoutes } from "./fixtures/commonRoutes.js";

test.describe("Classic battle flow", () => {
  test("timer auto-selects when expired", async ({ page }) => {
    await registerCommonRoutes(page);
    await page.addInitScript(() => {
      const orig = window.setInterval;
      window.setInterval = (fn, ms, ...args) => orig(fn, Math.min(ms, 10), ...args);
    });
    await page.goto("/src/pages/battleJudoka.html");
    await page.waitForSelector("#round-timer");
    const result = page.locator("#round-result");
    await expect(result).not.toHaveText("", { timeout: 1200 });
  });

  test("tie message appears on equal stats", async ({ page }) => {
    await registerCommonRoutes(page);
    await page.addInitScript(() => {
      const orig = window.setInterval;
      window.setInterval = (fn, ms, ...args) => orig(fn, Math.max(ms, 3600000), ...args);
    });
    await page.goto("/src/pages/battleJudoka.html");
    await page.waitForSelector("#round-timer");
    await page.evaluate(() => {
      document.querySelector("#player-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
      document.querySelector("#computer-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
    });
    await page.locator("button[data-stat='power']").click();
    await expect(page.locator("#round-result")).toHaveText(/Tie/);
  });

  test("quit match confirmation", async ({ page }) => {
    await registerCommonRoutes(page);
    await page.goto("/src/pages/battleJudoka.html");
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("#quit-btn").click();
    await expect(page.locator("#round-result")).toHaveText(/quit/i);
  });
});
