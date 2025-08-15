import { test, expect } from "./fixtures/commonSetup.js";

const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe.parallel("Battle orientation behavior", () => {
  test("updates orientation data attribute on rotation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");

    await page.setViewportSize({ width: 320, height: 480 });
    await page.evaluate(() => window.applyBattleOrientation?.());
    await page.waitForFunction(
      () => document.querySelector(".battle-header")?.dataset.orientation === "portrait"
    );

    await page.setViewportSize({ width: 480, height: 320 });
    await page.evaluate(() => window.applyBattleOrientation?.());
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

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        Math.random = () => 0.42;
        localStorage.setItem(
          "settings",
          JSON.stringify({
            featureFlags: { enableTestMode: { enabled: true } }
          })
        );
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
    });
  }
);
