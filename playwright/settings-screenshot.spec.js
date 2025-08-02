import { test, expect } from "./fixtures/commonSetup.js";
import fs from "fs";

const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe.parallel(
  runScreenshots ? "Settings screenshots" : "Settings screenshots (skipped)",
  () => {
    test.use({ viewport: { width: 1280, height: 720 } });
    test.skip(!runScreenshots);

    const modes = ["light", "dark", "gray"];

    for (const mode of modes) {
      test(`mode ${mode} collapsed`, async ({ page }) => {
        await page.route("**/src/data/navigationItems.json", (route) => {
          route.fulfill({ path: "tests/fixtures/navigationItems.json" });
        });
        await page.route("**/src/data/*.json", (route) => {
          const file = route.request().url().split("/").pop();
          const fixturePath = `tests/fixtures/${file}`;
          if (fs.existsSync(fixturePath)) {
            route.fulfill({ path: fixturePath });
          } else {
            route.continue();
          }
        });
        await page.addInitScript((mode) => {
          localStorage.setItem(
            "settings",
            JSON.stringify({ displayMode: mode, typewriterEffect: false })
          );
        }, mode);
        await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveScreenshot(`settings-${mode}-collapsed.png`, { fullPage: true });
      });

      test(`mode ${mode} expanded`, async ({ page }) => {
        await page.route("**/src/data/navigationItems.json", (route) => {
          route.fulfill({ path: "tests/fixtures/navigationItems.json" });
        });
        await page.route("**/src/data/*.json", (route) => {
          const file = route.request().url().split("/").pop();
          const fixturePath = `tests/fixtures/${file}`;
          if (fs.existsSync(fixturePath)) {
            route.fulfill({ path: fixturePath });
          } else {
            route.continue();
          }
        });
        await page.addInitScript((mode) => {
          localStorage.setItem(
            "settings",
            JSON.stringify({ displayMode: mode, typewriterEffect: false })
          );
        }, mode);
        await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
        await page.locator("#general-settings-toggle").click();
        await page.locator("#game-modes-toggle").click();
        await page.locator("#advanced-settings-toggle").click();
        await expect(page).toHaveScreenshot(`settings-${mode}-expanded.png`, { fullPage: true });
      });
    }
  }
);
