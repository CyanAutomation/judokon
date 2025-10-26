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
    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    await expect(container).not.toHaveText("");
    const getDocId = () => container.getAttribute("data-rendered-doc");
    const originalDocId = await getDocId();
    expect(originalDocId).not.toBeNull();
    const original = await container.innerHTML();

    // Navigate forward to second document
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(getDocId)
      .not.toBe(originalDocId);
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    const afterNext = await page.locator("#prd-content").innerHTML();
    expect(afterNext).not.toBe(original);

    // Navigate back to first document
    await page.keyboard.press("ArrowLeft");
    await expect.poll(getDocId).toBe(originalDocId);
    const afterPrev = await page.locator("#prd-content").innerHTML();
    expect(afterPrev).toBe(original);
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
    await expect(container).not.toHaveText("");
    const getDocId = () => container.getAttribute("data-rendered-doc");
    const initialDocId = await getDocId();
    expect(initialDocId).not.toBeNull();

    await radios.first().focus();
    await expect(radios.first()).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(container).toBeFocused();
    await expect
      .poll(getDocId)
      .not.toBe(initialDocId);
    const afterDownDocId = await getDocId();
    expect(afterDownDocId).not.toBe(initialDocId);

    await page.keyboard.press("ArrowRight");
    await expect(container).toBeFocused();
    await expect.poll(getDocId).toBe(initialDocId);
    const afterNextDocId = await getDocId();
    expect(afterNextDocId).toBe(initialDocId);
    await expect(container).not.toHaveText("");
  });
});
