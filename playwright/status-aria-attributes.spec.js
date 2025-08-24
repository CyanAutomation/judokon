import { test, expect } from "./fixtures/commonSetup.js";
import { waitForSettingsReady } from "./fixtures/waits.js";

const pages = [
  "/",
  "/src/pages/browseJudoka.html",
  "/src/pages/createJudoka.html",
  "/src/pages/randomJudoka.html",
  "/src/pages/meditation.html",
  "/src/pages/updateJudoka.html",
  "/src/pages/settings.html",
  "/src/pages/vectorSearch.html",
  "/src/pages/prdViewer.html",
  "/src/pages/tooltipViewer.html",
  "/src/pages/battleJudoka.html",
  "/src/pages/changeLog.html",
  "/src/pages/mockupViewer.html"
];

test.describe.parallel("Status aria attributes", () => {
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

  for (const url of pages) {
    test(`${url} has role=status and aria-live=polite`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      if (url.endsWith("/src/pages/settings.html")) {
        await waitForSettingsReady(page);
      }
      const statuses = await page.$$('[role="status"]');
      expect(statuses.length).toBeGreaterThan(0);
      for (const el of statuses) {
        expect(await el.getAttribute("aria-live")).toBe("polite");
      }
    });
  }
});
