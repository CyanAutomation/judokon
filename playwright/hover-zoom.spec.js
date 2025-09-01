import { test, expect } from "./fixtures/commonSetup.js";

const pageContent = `<!DOCTYPE html>
<html>
  <body data-test-disable-animations="true">
    <div class="card" id="hover-card">Card</div>
    <script type="module">
      import { addHoverZoomMarkers } from 'http://localhost:5000/src/helpers/setupHoverZoom.js';
      window.hoverZoomReady = Promise.resolve(addHoverZoomMarkers());
    </script>
  </body>
</html>`;

test.describe("Hover zoom markers", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/helpers/setupHoverZoom.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        path: "src/helpers/setupHoverZoom.js"
      })
    );
    await page.route("**/src/helpers/domReady.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        path: "src/helpers/domReady.js"
      })
    );
    await page.goto("/");
    await page.setContent(pageContent, { baseURL: "http://localhost:5000" });
    await page.evaluate(() => window.hoverZoomReady);
  });

  test("card toggles data-enlarged on hover", async ({ page }) => {
    const card = page.locator("#hover-card");
    await card.hover();
    await expect(card).toHaveAttribute("data-enlarged", "true");
    await page.dispatchEvent("#hover-card", "mouseleave");
    await expect(card).not.toHaveAttribute("data-enlarged", "true");
  });
});
