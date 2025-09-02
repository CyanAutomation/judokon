import { test, expect } from "./fixtures/commonSetup.js";
import { waitForSettingsReady, waitForBattleReady } from "./fixtures/waits.js";

// Allow skipping screenshots via the SKIP_SCREENSHOTS environment variable
const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe(runScreenshots ? "Screenshot suite" : "Screenshot suite (skipped)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test.skip(!runScreenshots);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.42;
      localStorage.setItem(
        "settings",
        JSON.stringify({
          typewriterEffect: false,
          featureFlags: { enableTestMode: { enabled: true } }
        })
      );
    });
  });

  // List of pages to capture screenshots for. Each entry includes a tag to
  // enable filtering with `npx playwright test --grep @tag` in CI.
  const pages = [
    { url: "/", name: "homepage.png", tag: "@homepage" },
    { url: "/src/pages/browseJudoka.html", name: "browseJudoka.png", tag: "@browseJudoka" },
    { url: "/src/pages/createJudoka.html", name: "createJudoka.png", tag: "@createJudoka" },
    { url: "/src/pages/randomJudoka.html", name: "randomJudoka.png", tag: "@randomJudoka" },
    { url: "/src/pages/meditation.html", name: "meditation.png", tag: "@meditation" },
    { url: "/src/pages/updateJudoka.html", name: "updateJudoka.png", tag: "@updateJudoka" },
    { url: "/src/pages/vectorSearch.html", name: "vectorSearch.png", tag: "@vectorSearch" },
    { url: "/src/pages/changeLog.html", name: "changeLog.png", tag: "@changeLog" }
  ];

  for (const { url, name, tag } of pages) {
    test(`${tag} screenshot ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveScreenshot(name, { fullPage: true });
    });
  }

  // Capture settings page in multiple display modes.
  const modes = ["light", "dark", "retro"];

  for (const mode of modes) {
    test(`@settings-${mode} screenshot`, async ({ page }) => {
      await page.addInitScript((mode) => {
        localStorage.setItem(
          "settings",
          JSON.stringify({
            displayMode: mode,
            typewriterEffect: false,
            featureFlags: { enableTestMode: { enabled: true } }
          })
        );
      }, mode);
      await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
      await waitForSettingsReady(page);
      await expect(page.locator("body")).toHaveAttribute("data-theme", mode);
      await expect(page).toHaveScreenshot(`settings-${mode}.png`, { fullPage: true });
    });
  }

  test("@battleJudoka-narrow screenshot", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator("#round-select-1").click();
    await waitForBattleReady(page);
    await page.setViewportSize({ width: 280, height: 800 });
    await expect(page).toHaveScreenshot("battleJudoka-narrow.png", {
      mask: [page.locator("#battle-state-progress")]
    });
  });

  test("@randomJudoka-signature screenshot", async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
    await page.getByTestId("draw-button").click();
    await page.locator('body[data-signature-move-ready="true"]').waitFor();
    const sigMove = page.locator(".signature-move-container");
    await expect(sigMove).toHaveScreenshot("randomJudoka-signature.png");
  });

  test("@browseJudoka-signature screenshot", async ({ page }) => {
    await page.goto("/src/pages/browseJudoka.html");
    await page.locator('body[data-signature-move-ready="true"]').waitFor();
    const sigMove = page.locator(".signature-move-container").first();
    await expect(sigMove).toHaveScreenshot("browseJudoka-signature.png");
  });
});
