import { test, expect } from "@playwright/test";

// Allow skipping screenshots via the SKIP_SCREENSHOTS environment variable
const runScreenshots = process.env.SKIP_SCREENSHOTS !== 'true';

test.describe(runScreenshots ? "Screenshot suite" : "Screenshot suite (skipped)", () => {
  test.skip(!runScreenshots);
  // List of pages to capture screenshots for
  const pages = [
    "/",
    "/src/pages/battleJudoka.html",
    "/src/pages/carouselJudoka.html",
    "/src/pages/createJudoka.html",
    "/src/pages/randomJudoka.html",
    "/src/pages/quoteKG.html",
    "/src/pages/updateJudoka.html"
  ];

  for (const url of pages) {
    test(`screenshot ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const name = url === "/" ? "homepage.png" : url.split("/").pop().replace(".html", ".png");
      await expect(page).toHaveScreenshot(name, { fullPage: true });
    });
  }
});
