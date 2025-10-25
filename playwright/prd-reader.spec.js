import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

test.describe("PRD Reader page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/prdIndex.json", (route) =>
      route.fulfill({ path: "tests/fixtures/prdIndex.json" })
    );
    await page.route("**/docA.md", (route) => route.fulfill({ path: "tests/fixtures/docA.md" }));
    await page.route("**/docB.md", (route) => route.fulfill({ path: "tests/fixtures/docB.md" }));
    await page.route("https://esm.sh/dompurify@3.2.6", (route) =>
      route.fulfill({ path: "node_modules/dompurify/dist/purify.es.mjs" })
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/src/pages/prdViewer.html");
  });

  test("PRD reader basics", async ({ page }) => {
    await verifyPageBasics(page);
  });

  test("forward and back navigation", async ({ page }) => {
    const container = page.locator("#prd-content");
    const readContent = async () => (await container.textContent())?.trim() ?? "";
    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    await expect(container).not.toHaveText("");
    const original = await readContent();

    // Navigate forward to second document
    await page.keyboard.press("ArrowRight");
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    await expect.poll(readContent).toContain("This is context B1.");
    await expect.poll(readContent).not.toBe(original);

    // Navigate back to first document
    await page.keyboard.press("ArrowLeft");
    await expect.poll(readContent).toBe(original);
    await expect(container).toContainText("This is context A1.");
  });

  test("sidebar-tab-traversal", async ({ page }) => {
    const radios = page.locator(".sidebar-list input[type='radio']");
    const container = page.locator("#prd-content");
    await expect(container).toBeFocused();
    await radios.first().focus();
    await expect(radios.first()).toBeFocused();

    await page.keyboard.press("Space");
    await expect(container).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(container).not.toBeFocused();
  });

  test("arrow-key-content-switching", async ({ page }) => {
    const radios = page.locator(".sidebar-list input[type='radio']");
    const container = page.locator("#prd-content");
    const readContent = async () => (await container.textContent())?.trim() ?? "";
    await expect.poll(readContent).toContain("This is context A1.");
    const initialContent = await readContent();

    await radios.first().focus();
    await expect(radios.first()).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(container).toBeFocused();

    await expect.poll(readContent).toContain("This is context B1.");
    await expect.poll(readContent).not.toBe(initialContent);
    await expect(container).toContainText("This is context B1.");

    await page.keyboard.press("ArrowRight");
    await expect(container).toBeFocused();

    await expect.poll(readContent).toBe(initialContent);
    await expect(container).toContainText("This is context A1.");
  });
});
