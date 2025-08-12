import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe.parallel("PRD Reader page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/prdViewer.html");
  });

  test("page basics", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
  });

  test("forward and back navigation", async ({ page }) => {
    const container = page.locator("#prd-content");
    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    await expect(container).not.toHaveText("");
    const original = await container.innerHTML();

    await page.keyboard.press("ArrowRight");
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    const afterNext = await page.locator("#prd-content").innerHTML();
    expect(afterNext).not.toBe(original);

    await page.keyboard.press("ArrowLeft");
    const afterPrev = await page.locator("#prd-content").innerHTML();
    expect(afterPrev).toBe(original);
  });

  test("tab and arrow key traversal", async ({ page }) => {
    const items = page.locator(".sidebar-list li");
    const container = page.locator("#prd-content");
    await expect(container).not.toHaveText("");
    const initial = await container.innerHTML();
    const isFirstFocused = async () =>
      await items.first().evaluate((el) => el === document.activeElement);
    let attempts = 0;
    while (!(await isFirstFocused()) && attempts < 10) {
      await page.keyboard.press("Tab");
      attempts += 1;
    }
    if (!(await isFirstFocused())) {
      attempts = 0;
      while (!(await isFirstFocused()) && attempts < 10) {
        await page.keyboard.press("Shift+Tab");
        attempts += 1;
      }
    }
    await expect(items.first()).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(items.first()).toBeFocused();
    expect(await container.innerHTML()).toBe(initial);

    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    const afterArrow = await container.innerHTML();
    expect(afterArrow).not.toBe(initial);

    await page.keyboard.press("Enter");
    await expect(container).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(container).toBeFocused();
    const afterNext = await container.innerHTML();
    expect(afterNext).not.toBe(afterArrow);

    await page.keyboard.press("Tab");
    await expect(container).not.toBeFocused();
  });
});
