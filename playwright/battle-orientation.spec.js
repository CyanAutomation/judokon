import { test, expect } from "./fixtures/commonSetup.js";

const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe("Battle orientation behavior", () => {
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

test.describe(
  runScreenshots ? "Battle orientation screenshots" : "Battle orientation screenshots (skipped)",
  () => {
    test.skip(!runScreenshots);

    test("captures portrait and landscape headers", async ({ page }) => {
      await page.goto("/src/pages/battleJudoka.html");
      await page.waitForSelector("#score-display br");

      await page.setViewportSize({ width: 320, height: 480 });
      await page.waitForFunction(
        () => document.querySelector(".battle-header")?.dataset.orientation === "portrait"
      );
      await page.waitForSelector("#score-display br");
      await expect(page.locator(".battle-header")).toHaveScreenshot("battle-header-portrait.png");

      await page.setViewportSize({ width: 480, height: 320 });
      await page.waitForFunction(
        () => document.querySelector(".battle-header")?.dataset.orientation === "landscape"
      );
      await page.waitForSelector("#score-display br");
      await expect(page.locator(".battle-header")).toHaveScreenshot("battle-header-landscape.png");
    });

    test("captures extra-narrow header", async ({ page }) => {
      await page.goto("/src/pages/battleJudoka.html");
      await page.waitForSelector("#score-display br");

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
      await page.waitForSelector("#score-display br");
      await expect(page.locator(".battle-header")).toHaveScreenshot("battle-header-300.png");
    });
  }
);
