import { test, expect } from "./fixtures/commonSetup.js";

const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe.parallel(
  runScreenshots ? "Settings screenshots" : "Settings screenshots (skipped)",
  () => {
    test.use({ viewport: { width: 1280, height: 720 } });
    test.skip(!runScreenshots);

    const modes = ["light", "dark", "high-contrast"];

    for (const mode of modes) {
      test(`mode ${mode}`, async ({ page }) => {
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
        await expect(page).toHaveScreenshot(`settings-${mode}.png`, { fullPage: true });
      });
    }
  }
);
