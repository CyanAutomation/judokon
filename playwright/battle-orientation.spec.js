import { test, expect } from "./fixtures/commonSetup.js";
import os from "os";

function getOsSuffix() {
  const p = os.platform();
  if (p === "linux") return "-linux";
  if (p === "darwin") return "-darwin";
  return "-win32";
}

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

    test("captures portrait and landscape headers", async ({ page }) => {
      // Helper to ensure the header stops mutating before taking a snapshot.
      // We consider it stable when its innerText stays unchanged for 300ms.
      const waitForHeaderStability = async () => {
        await page.evaluate(() => {
          const el = document.querySelector(".battle-header");
          if (!el) return true;
          return new Promise((resolve) => {
            let last = el.innerText;
            let stableSince = performance.now();
            const id = setInterval(() => {
              const nowText = el.innerText;
              if (nowText !== last) {
                last = nowText;
                stableSince = performance.now();
              }
              if (performance.now() - stableSince >= 300) {
                clearInterval(id);
                resolve(true);
              }
            }, 50);
          });
        });
      };
      const osSuffix = getOsSuffix();
      await page.goto("/src/pages/battleJudoka.html");
      await page.waitForSelector("#score-display span", { state: "attached" });
      await page.evaluate(() => window.skipBattlePhase?.());
      await page.waitForFunction(
        () => document.querySelector("#round-message")?.textContent.trim().length > 0
      );
      await page.evaluate(() => window.skipBattlePhase?.());

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
      await expect(page.locator(".battle-header")).toBeVisible();
      await waitForHeaderStability();
      await expect(page.locator(".battle-header")).toHaveScreenshot(
        `battle-header-portrait${osSuffix}.png`
      );

      await page.setViewportSize({ width: 480, height: 320 });
      await page.waitForFunction(
        () => document.querySelector(".battle-header")?.dataset.orientation === "landscape"
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
      await expect(page.locator(".battle-header")).toBeVisible();
      await waitForHeaderStability();
      await expect(page.locator(".battle-header")).toHaveScreenshot(
        `battle-header-landscape${osSuffix}.png`
      );
    });

    test("captures extra-narrow header", async ({ page }) => {
      const osSuffix = getOsSuffix();
      await page.goto("/src/pages/battleJudoka.html");
      await page.waitForSelector("#score-display span", { state: "attached" });
      await page.evaluate(() => window.skipBattlePhase?.());
      await page.waitForFunction(
        () => document.querySelector("#round-message")?.textContent.trim().length > 0
      );
      await page.evaluate(() => window.skipBattlePhase?.());
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
      // Reuse the same stability guard as the main screenshot test
      await expect(page.locator(".battle-header")).toBeVisible();
      await page.evaluate(() => {
        const el = document.querySelector(".battle-header");
        if (!el) return true;
        return new Promise((resolve) => {
          let last = el.innerText;
          let stableSince = performance.now();
          const id = setInterval(() => {
            const nowText = el.innerText;
            if (nowText !== last) {
              last = nowText;
              stableSince = performance.now();
            }
            if (performance.now() - stableSince >= 300) {
              clearInterval(id);
              resolve(true);
            }
          }, 50);
        });
      });
      await expect(page.locator(".battle-header")).toHaveScreenshot(
        `battle-header-300${osSuffix}.png`
      );
    });
  }
);
