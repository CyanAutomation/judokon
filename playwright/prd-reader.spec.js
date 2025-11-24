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

  test("forward and back navigation shows correct content", async ({ page }) => {
    const container = page.locator("#prd-content");
    const labels = page.locator(".sidebar-list__label");
    const radios = page.locator(".sidebar-list input[type='radio']");
    const docTitle = page.locator("#prd-title");
    const getDocId = () => container.getAttribute("data-rendered-doc");

    const expectDocA = async () => {
      await expect(container).toHaveAttribute("data-rendered-doc", "docA");
      await expect(container).toContainText("DocA");
      await expect(container).toContainText("Summary");
      await expect(container).toContainText("[Deep Dive](#deep-dive-a)");
    };

    const expectDocB = async () => {
      await expect(container).toHaveAttribute("data-rendered-doc", "docB");
      await expect(container).toContainText("DocB");
      await expect(container).toContainText("Overview");
      await expect(container).toContainText("(#tasks-b)");
    };

    const expectActiveTab = async (index) => {
      await expect(radios.nth(index)).toBeChecked();
      await expect(labels.nth(index)).toHaveAttribute("aria-current", "page");
    };

    await expect(container).not.toHaveText("");
    await expectDocA();
    await expect(docTitle).toHaveText("DocA");
    await expectActiveTab(0);

    await container.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(getDocId).toBe("docB");
    await expectDocB();
    await expect(docTitle).toHaveText("DocB");
    await expectActiveTab(1);

    await page.keyboard.press("ArrowLeft");
    await expect.poll(getDocId).toBe("docA");
    await expectDocA();
    await expect(docTitle).toHaveText("DocA");
    await expectActiveTab(0);
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

  test("keyboard traversal announces active document", async ({ page }) => {
    const radios = page.locator(".sidebar-list input[type='radio']");
    const labels = page.locator(".sidebar-list__label");
    const container = page.locator("#prd-content");
    const docTitle = page.locator("#prd-title");
    const getDocId = () => container.getAttribute("data-rendered-doc");

    await expect(container).toHaveAttribute("tabindex", "0");
    await expect(docTitle).toHaveText("DocA");
    await expect(container).toContainText("DocA");

    await radios.first().focus();
    await expect(radios.first()).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(container).toBeFocused();
    await expect.poll(getDocId).toBe("docB");
    await expect(docTitle).toHaveText("DocB");
    await expect(labels.nth(1)).toHaveAttribute("aria-current", "page");
    await expect(container).toContainText("DocB");

    await page.keyboard.press("ArrowLeft");
    await expect(container).toBeFocused();
    await expect.poll(getDocId).toBe("docA");
    await expect(docTitle).toHaveText("DocA");
    await expect(labels.first()).toHaveAttribute("aria-current", "page");
    await expect(container).toContainText("DocA");
  });

  test("layout avoids horizontal overflow during navigation", async ({ page }) => {
    const container = page.locator("#prd-content");
    const getDocId = () => container.getAttribute("data-rendered-doc");
    const expectNoOverflow = async () => {
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow).toBe(false);
    };

    await expectNoOverflow();
    await container.focus();

    await page.keyboard.press("ArrowRight");
    await expect.poll(getDocId).toBe("docB");
    await expectNoOverflow();

    await page.keyboard.press("ArrowLeft");
    await expect.poll(getDocId).toBe("docA");
    await expectNoOverflow();
  });
});
