import { test, expect } from "./fixtures/commonSetup.js";
import fs from "fs";

// Allow skipping screenshots via the SKIP_SCREENSHOTS environment variable
const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe.parallel(runScreenshots ? "Screenshot suite" : "Screenshot suite (skipped)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test.skip(!runScreenshots);
  // List of pages to capture screenshots for
  const pages = [
    { url: "/", name: "homepage.png" },
    { url: "/src/pages/browseJudoka.html", name: "browseJudoka.png" },
    { url: "/src/pages/createJudoka.html", name: "createJudoka.png" },
    { url: "/src/pages/randomJudoka.html", name: "randomJudoka.png" },
    { url: "/src/pages/meditation.html", name: "meditation.png" },
    { url: "/src/pages/updateJudoka.html", name: "updateJudoka.png" },
    { url: "/src/pages/settings.html", name: "settings.png" }
  ];

  for (const { url, name } of pages) {
    test(`screenshot ${url}`, async ({ page }) => {
      await page.route("**/src/data/gameModes.json", (route) => {
        route.fulfill({ path: "tests/fixtures/gameModes.json" });
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
      await page.addInitScript(() => {
        Math.random = () => 0.42;
      });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveScreenshot(name, { fullPage: true });
    });
  }
});
