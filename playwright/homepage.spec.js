import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("homepage loads", async ({ page }) => {
    await expect(page).toHaveTitle(/JU-DO-KON!/);
    await expect(page.locator("h1")).toContainText("JU-DO-KON!");
  });

  test("keyboard navigation focuses tiles", async ({ page }) => {
    const tiles = page.locator(".card");

    await page.keyboard.press("Tab");
    await expect(tiles.first()).toBeFocused();
  });

  test("fallback icon applied on load failure", async ({ page }) => {
    await page.goto("/playwright/fixtures/svg-fallback.html");

    const icon = page.getByTestId("broken-icon");
    await expect(icon).toBeVisible();
    await expect.poll(() => icon.getAttribute("src")).toContain("judokonLogoSmall.png");
    await expect(icon).toHaveClass(/svg-fallback/);
  });

  test("tiles meet contrast ratio", async ({ page }) => {
    const tile = page.locator(".card").first();
    const styles = await tile.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });

    const parse = (c) => c.match(/\d+(?:\.\d+)?/g).map(Number);
    const luminance = (r, g, b) => {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };

    const [br, bg, bb] = parse(styles.bg);
    const [cr, cg, cb] = parse(styles.color);
    const ratio =
      (Math.max(luminance(br, bg, bb), luminance(cr, cg, cb)) + 0.05) /
      (Math.min(luminance(br, bg, bb), luminance(cr, cg, cb)) + 0.05);

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
