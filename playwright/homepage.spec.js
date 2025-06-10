import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("page loads", async ({ page }) => {
    await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.getByAltText("JU-DO-KON! Logo");
    await expect(logo).toHaveAttribute("alt", "JU-DO-KON! Logo");
  });

  test("navigation links visible", async ({ page }) => {
    await page.waitForSelector("footer .bottom-navbar a");
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: /view judoka/i })).toBeVisible();
    await expect(
      page.locator("footer").getByRole("link", { name: /classic battle/i })
    ).toBeVisible();
  });

  test("footer navigation links present", async ({ page }) => {
    const footerLinks = page.locator("footer .bottom-navbar a");
    await expect(footerLinks).not.toHaveCount(0);
  });

  test("view judoka link navigates", async ({ page }) => {
    await page
      .locator("footer")
      .getByRole("link", { name: /view judoka/i })
      .click();
    await expect(page).toHaveURL(/carouselJudoka\.html/);
  });

  test("tile hover zoom and cursor", async ({ page }) => {
    const tile = page.locator(".game-tile").first();
    const before = await tile.boundingBox();
    await tile.hover();
    await page.waitForFunction(async (tile) => {
      const before = await tile.boundingBox();
      const after = await tile.boundingBox();
      return after.width > before.width;
    }, tile);
    const after = await tile.boundingBox();
    const ratio = after.width / before.width;
    expect(ratio).toBeGreaterThan(1.03);
    const cursor = await tile.evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toBe("pointer");
  });

  test("keyboard navigation activates tiles", async ({ page }) => {
    const tiles = page.locator(".game-tile");

    await page.keyboard.press("Tab");
    await expect(tiles.first()).toBeFocused();

    await Promise.all([page.waitForURL("**/battleJudoka.html"), tiles.first().press("Enter")]);
  });

  test("fallback icon applied on load failure", async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const img = document.createElement("img");
        img.id = "broken-icon";
        img.src = "./missing-icon.svg";
        img.alt = "Broken icon";
        document.body.appendChild(img);
      });
    });

    await page.goto("/index.html");

    const icon = page.locator("#broken-icon");
    await icon.waitFor();
    await expect.poll(() => icon.getAttribute("src")).toContain("judokonLogoSmall.png");
    await expect(icon).toHaveClass(/svg-fallback/);
  });

  test("tiles meet contrast ratio", async ({ page }) => {
    const tile = page.locator(".game-tile").first();
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
