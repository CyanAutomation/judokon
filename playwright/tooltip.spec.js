import { test, expect } from "./fixtures/commonSetup.js";

/** Simple page with tooltip-enabled button */
const pageContent = `<!DOCTYPE html>
<html>
  <body>
    <button id="tip-btn" data-tooltip-id="info">Info</button>
    <script type="module">
      import { initTooltips } from 'http://localhost:5000/src/helpers/tooltip.js';
      initTooltips().then(() => { window.initDone = true; });
    </script>
  </body>
</html>`;

test.describe("Tooltip behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/tooltips.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        path: "tests/fixtures/tooltips.json"
      })
    );
    await page.setContent(pageContent, { baseURL: "http://localhost:5000" });
    await page.waitForFunction(() => window.initDone === true);
  });

  test("tooltip appears on hover and hides on mouse leave", async ({ page }) => {
    const button = page.locator("#tip-btn");
    await button.hover();
    const tooltip = page.locator(".tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Helpful tip");

    await page.dispatchEvent("#tip-btn", "mouseleave");
    await expect(tooltip).toBeHidden();
  });
});
