import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe("Homepage", () => {
  // Navigation coverage: footer link visibility and ordering.
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
    await page.evaluate(() => window.navReadyPromise);
  });

  test("homepage loads", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
    const footerLinks = page.locator("footer .bottom-navbar a");
    await expect(footerLinks).not.toHaveCount(0);
  });

  // Navigation: links render in expected order
  test("navigation order and visibility", async ({ page }) => {
    const classic = page.getByTestId(NAV_CLASSIC_BATTLE);
    const random = page.getByTestId(NAV_RANDOM_JUDOKA);
    const update = page.getByTestId("nav-9");

    await expect(classic).not.toHaveClass(/hidden/);
    await expect(random).not.toHaveClass(/hidden/);
    await expect(update).toHaveClass(/hidden/);

    const classicOrder = Number(await classic.evaluate((el) => getComputedStyle(el).order));
    const randomOrder = Number(await random.evaluate((el) => getComputedStyle(el).order));
    const updateOrder = Number(await update.evaluate((el) => getComputedStyle(el).order));

    expect(classicOrder).toBeLessThan(updateOrder);
    expect(updateOrder).toBeLessThan(randomOrder);
  });
  // Navigation: Random Judoka tile routes to dedicated page
  test("view judoka link navigates", async ({ page }) => {
    await page.getByTestId(NAV_RANDOM_JUDOKA).click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
  });

  test("keyboard navigation activates tiles", async ({ page }) => {
    const tiles = page.locator(".card");

    await page.keyboard.press("Tab");
    await expect(tiles.first()).toBeFocused();

    await Promise.all([page.waitForURL("**/battleClassic.html"), tiles.first().press("Enter")]);
  });

  test("fallback icon applied on load failure", async ({ page }) => {
    await page.addInitScript(() => {
      window.brokenIconInsertedPromise = new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", () => {
          const img = document.createElement("img");
          img.id = "broken-icon";
          img.src = "./missing-icon.svg";
          img.alt = "Broken icon";
          document.body.appendChild(img);
          resolve();
        });
      });
    });

    await page.goto("/index.html");
    await page.evaluate(() => window.brokenIconInsertedPromise);

    const icon = page.locator("#broken-icon");
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
