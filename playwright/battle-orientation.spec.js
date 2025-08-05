import { test, expect } from "./fixtures/commonSetup.js";

const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe.parallel("Battle orientation behavior", () => {
  test("updates orientation data attribute on rotation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");

    await page.setViewportSize({ width: 320, height: 480 });
    await page.waitForFunction(
      () => document.querySelector(".battle-header")?.dataset.orientation === "portrait"
    );

    await page.setViewportSize({ width: 480, height: 320 });
    await page.waitForFunction(
      () => document.querySelector(".battle-header")?.dataset.orientation === "landscape"
    );
  });

  test("truncates round message below 320px", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.setViewportSize({ width: 300, height: 600 });
    const msg = page.locator("#round-message");
    await msg.evaluate(
      (el) => (el.textContent = "A very long round message that should overflow on narrow screens")
    );
    const overflow = await msg.evaluate((el) => getComputedStyle(el).textOverflow);
    expect(overflow).toBe("ellipsis");
  });
});

test.describe.parallel(
  runScreenshots ? "Battle orientation screenshots" : "Battle orientation screenshots (skipped)",
  () => {
    test.skip(!runScreenshots);

    test("captures portrait and landscape headers", async ({ page }) => {
      await page.addInitScript(() => {
        window.startCountdownOverride = () => {};
        const originalSetInterval = window.setInterval;
        window.setInterval = (fn, ms, ...args) =>
          originalSetInterval(fn, Math.max(ms, 3600000), ...args);
      });

      await page.goto("/src/pages/battleJudoka.html");
      await page.waitForSelector("#score-display span", { state: "attached" });

      await page.setViewportSize({ width: 320, height: 480 });
      await page.waitForFunction(
        () => document.querySelector(".battle-header")?.dataset.orientation === "portrait"
      );
      await page.waitForSelector("#score-display span", { state: "attached" });
      await page.evaluate(() => {
        return Promise.race([
          document.fonts.ready,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout waiting for document.fonts.ready")), 5000)
          )
        ]).catch((err) => {
          throw new Error("Font loading failed or timed out: " + err.message);
        });
      });
      await page.waitForFunction(() => document.querySelector(".battle-header img.logo")?.complete);
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(
        () => document.querySelector("#round-message")?.textContent.trim().length > 0
      );
      await expect(page.locator(".battle-header")).toHaveScreenshot("battle-header-portrait.png");

      await page.setViewportSize({ width: 480, height: 320 });
      await page.waitForFunction(
        () => document.querySelector(".battle-header")?.dataset.orientation === "landscape"
      );
      await page.waitForSelector("#score-display span", { state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.querySelector(".battle-header img.logo")?.complete);
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(
        () => document.querySelector("#round-message")?.textContent.trim().length > 0
      );
      await expect(page.locator(".battle-header")).toHaveScreenshot("battle-header-landscape.png");
    });

    test("captures extra-narrow header", async ({ page }) => {
      await page.addInitScript(() => {
        window.startCountdownOverride = () => {};
        const originalSetInterval = window.setInterval;
        window.setInterval = (fn, ms, ...args) =>
          originalSetInterval(fn, Math.max(ms, 3600000), ...args);
      });

      await page.goto("/src/pages/battleJudoka.html");
      await page.waitForSelector("#score-display span", { state: "attached" });
      await page.evaluate(() => document.fonts.ready);

      await page.setViewportSize({ width: 300, height: 600 });
      await page.waitForFunction(
        () => document.querySelector(".battle-header")?.dataset.orientation === "portrait"
      );
      await page
        .locator("#round-message")
        .evaluate(
          (el) =>
            (el.textContent = "A very long round message that should overflow on narrow screens")
        );
      await page.waitForFunction(
        () => document.querySelector("#round-message")?.textContent.trim().length > 0
      );
      await expect(page.locator(".battle-header")).toHaveScreenshot("battle-header-300.png");
    });
  }
);
