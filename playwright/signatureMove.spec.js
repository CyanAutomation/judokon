import { test, expect } from "./fixtures/commonSetup.js";

const runScreenshots = process.env.SKIP_SCREENSHOTS !== "true";

test.describe.parallel(
  runScreenshots ? "Signature move screenshots" : "Signature move screenshots (skipped)",
  () => {
    test.skip(!runScreenshots);

    test("random judoka page", async ({ page }) => {
      await page.goto("/src/pages/randomJudoka.html");
      await page.getByTestId("draw-button").click();
      const sigMove = page.locator(".signature-move-container");
      await sigMove.waitFor();
      await expect(sigMove).toHaveScreenshot("randomJudoka-signature.png");
    });

    test("browse judoka page", async ({ page }) => {
      await page.goto("/src/pages/browseJudoka.html");
      const sigMove = page.locator(".signature-move-container").first();
      await sigMove.waitFor();
      await expect(sigMove).toHaveScreenshot("browseJudoka-signature.png");
    });
  }
);
