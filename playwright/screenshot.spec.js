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

  // Global comparison tolerance for tiny AA/rounding differences.
  // Exposed here so we can reuse consistently across specs.
  const BASE_SCREENSHOT_OPTS = { maxDiffPixels: 100 };

  // Allow switching to viewport-only screenshots without changing code.
  // Opt in with SCREENSHOT_VIEWPORT_ONLY=true when you want to
  // regenerate snapshots that don't depend on below-the-fold content.
  const VIEWPORT_ONLY = process.env.SCREENSHOT_VIEWPORT_ONLY === "true";
  const pageScreenshotOpts = (defaultFullPage = false) => ({
    ...BASE_SCREENSHOT_OPTS,
    ...(defaultFullPage && !VIEWPORT_ONLY ? { fullPage: true } : {})
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
      // Keep existing full-page behavior by default to avoid baseline churn.
      // Set SCREENSHOT_VIEWPORT_ONLY=true to capture only the viewport and
      // regenerate smaller, less fragile baselines.
      await expect(page).toHaveScreenshot(name, pageScreenshotOpts(true));
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
      await expect(page).toHaveScreenshot(`settings-${mode}.png`, pageScreenshotOpts(true));
    });
  }

  test("@battleJudoka-narrow screenshot", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html?autostart=1");
    await waitForBattleReady(page);
    await page.setViewportSize({ width: 280, height: 800 });
    await expect(page).toHaveScreenshot("battleJudoka-narrow.png", {
      ...BASE_SCREENSHOT_OPTS,
      mask: [page.locator("#battle-state-progress")]
    });
  });

  test("@randomJudoka-signature screenshot", async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
    await page.getByTestId("draw-button").click();
    await page.locator('body[data-signature-move-ready="true"]').waitFor();
    const sigMove = page.locator(".signature-move-container");
    await expect(sigMove).toHaveScreenshot("randomJudoka-signature.png", BASE_SCREENSHOT_OPTS);
  });

  test("@browseJudoka-signature screenshot", async ({ page }) => {
    await page.goto("/src/pages/browseJudoka.html");
    await page.locator('body[data-signature-move-ready="true"]').waitFor();
    const sigMove = page.locator(".signature-move-container").first();
    await expect(sigMove).toHaveScreenshot("browseJudoka-signature.png", BASE_SCREENSHOT_OPTS);
  });
});
