import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("homepage loads", async ({ page }) => {
    await expect(page).toHaveTitle(/JU-DO-KON!/);
    await expect(page.locator("h1")).toContainText("JU-DO-KON!");
  });

  test("hero landmark exposes JU-DO-KON! brand heading", async ({ page }) => {
    const hero = page.getByRole("main");
    await expect(hero).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "JU-DO-KON!" })).toBeVisible();
  });

  test("primary classic battle CTA is advertised and points to battle page", async ({ page }) => {
    const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute("href", "./src/pages/battleClassic.html");
  });

  test("selecting the classic battle tile navigates into classic battle experience", async ({ page }) => {
    await page.getByRole("link", { name: "Start classic battle mode" }).click();

    await expect(page).toHaveURL(/\/src\/pages\/battleClassic\.html$/);
    await expect(page.getByRole("group", { name: "Choose a stat" })).toBeVisible();
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
