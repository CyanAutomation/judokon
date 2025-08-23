import { test, expect } from "./fixtures/commonSetup.js";

/** Simple page with tooltip-enabled button */
const pageContent = `<!DOCTYPE html>
<html>
  <body>
    <button id="tip-btn" data-tooltip-id="stat.power">Power</button>
    <script type="module">
      import { initTooltips } from 'http://localhost:5000/src/helpers/tooltip.js';
      initTooltips().then(() => { window.initDone = true; });
    </script>
  </body>
</html>`;

test.describe.parallel("Tooltip behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/helpers/tooltip.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        path: "src/helpers/tooltip.js"
      })
    );
    await page.goto("/");
    await page.setContent(pageContent, { baseURL: "http://localhost:5000" });
    await page.waitForFunction(() => window.initDone === true);
  });

  test("tooltip appears on hover and hides on mouse out", async ({ page }) => {
    const button = page.locator("#tip-btn");
    await button.hover();
    const tooltip = page.locator(".tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("raw physical strength");

    await page.dispatchEvent("#tip-btn", "mouseout");
    await expect(tooltip).toBeHidden();
  });
});
