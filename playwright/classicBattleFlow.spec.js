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
    const countdown = page.locator("header #next-round-timer");
    await countdown.waitFor();
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
    const timer = page.locator("header #next-round-timer");
    await timer.waitFor();
    await page.evaluate(async () => {
      const mod = await import("../helpers/classicBattle.js");
      mod.classicBattle._resetForTest();
      document.querySelector("#next-round-timer").textContent = "Time Left: 3s";
      document.querySelector("#player-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
      document.querySelector("#computer-card").innerHTML =
        `<ul><li class='stat'><strong>Power</strong> <span>3</span></li></ul>`;
    });
    await page.locator("button[data-stat='power']").click();
    const msg = page.locator("header #round-message");
    await expect(msg).toHaveText(/Tie/);
    await expect(timer).toHaveText(/\d+/);
  });

  test("quit match confirmation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("[data-testid='home-link']").click();
    await expect(page).toHaveURL(/index.html/);
  });

  test("animations maintain frame rate", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator("#stat-buttons button").first().click();
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let count = 0;
          const start = performance.now();
          function measure(now) {
            count++;
            if (now - start >= 1000) {
              resolve(count);
            } else {
              requestAnimationFrame(measure);
            }
          }
          requestAnimationFrame(measure);
        })
    );
    expect(frames).toBeGreaterThanOrEqual(55);
  });
});
