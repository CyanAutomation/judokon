import { test, expect } from "./fixtures/commonSetup.js";

// Allow skipping screenshots via the SKIP_SCREENSHOTS environment variable
const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe.parallel(runScreenshots ? "Screenshot suite" : "Screenshot suite (skipped)", () => {
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
    { url: "/src/pages/settings.html", name: "settings.png", tag: "@settings" },
    { url: "/src/pages/vectorSearch.html", name: "vectorSearch.png", tag: "@vectorSearch" }
  ];

  for (const { url, name, tag } of pages) {
    test(`${tag} screenshot ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      if (url.endsWith("/src/pages/settings.html")) {
        await page.evaluate(() => window.settingsReadyPromise);
      }
      await expect(page).toHaveScreenshot(name, { fullPage: true });
    });
  }
});
