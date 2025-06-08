import { test, expect } from "@playwright/test";

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
    await page.goto(url);
    const name = url === "/" ? "homepage.png" : url.split("/").pop().replace(".html", ".png");
    await expect(page).toHaveScreenshot(name);
  });
}
